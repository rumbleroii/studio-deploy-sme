import {
	unstable_v2_createSession,
	unstable_v2_resumeSession,
} from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs/promises";
import path from "node:path";

async function readOptional(filePath: string): Promise<string> {
	try {
		return await fs.readFile(filePath, "utf-8");
	} catch {
		return "";
	}
}

async function main() {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		console.error("Error: ANTHROPIC_API_KEY not found in environment");
		process.exit(1);
	}

	const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
	const pathToClaudeCodeExecutable =
		process.env.CLAUDE_CODE_PATH || "/runner/node_modules/.bin/claude";

	// Inputs live in the project workspace directory.
	const projectDir = process.cwd();

	// Create a dedicated working directory inside the project workspace.
	// Claude Agent SDK V2 does NOT expose a `cwd` option; it uses `process.cwd()`,
	// so we chdir() into the working directory before starting the session.
	const workingDir = path.join(projectDir, "working_directory");
	await fs.mkdir(workingDir, { recursive: true });

	// Copy baked-in .claude into the working directory (first run only).
	const bakedClaudeDir = "/runner/working_directory/.claude";
	const workingClaudeDir = path.join(workingDir, ".claude");
	try {
		await fs.stat(workingClaudeDir);
	} catch {
		try {
			// Node 20+ supports fs.cp
			await fs.cp(bakedClaudeDir, workingClaudeDir, { recursive: true });
		} catch (err) {
			console.error("Warning: failed to copy baked .claude:", String(err));
		}
	}

	const researchObjective = await readOptional(
		path.join(projectDir, "research_objective.md")
	);
	const userMessage = await readOptional(
		path.join(projectDir, ".current_message.txt")
	);
	if (!userMessage) {
		console.error("Error: .current_message.txt not found");
		process.exit(1);
	}

	// Persist Claude Code state in working_directory/.claude.
	const claudeConfigDir = workingClaudeDir;
	await fs.mkdir(claudeConfigDir, { recursive: true });

	const sessionFilePath = path.join(projectDir, ".claude_session_id");
	const existingSessionId = (await readOptional(sessionFilePath)).trim();

	const sessionOptions = {
		model,
		pathToClaudeCodeExecutable,
		env: {
			...process.env,
			ANTHROPIC_API_KEY: apiKey,
			CLAUDE_CONFIG_DIR: claudeConfigDir,
		},
	} as const;

	const isNewSession = !existingSessionId;

	// First turn: include the research objective as context.
	// Subsequent turns: keep a lightweight reminder to avoid tool use.
	let promptPrefix = "You are a research assistant.";
	if (researchObjective && isNewSession) {
		promptPrefix =
			"You are a research assistant. Use the following context.\n\nContext:\n" +
			researchObjective +
			"\n\n";
	}
	const perTurnPrefix = "";
	const messageToSend = isNewSession
		? promptPrefix + userMessage
		: perTurnPrefix + userMessage;

	// Make the Agent SDK treat working_directory/ as the current working directory.
	// (V2 sessions do not accept a `cwd` option.)
	process.chdir(workingDir);

	const session = existingSessionId
		? unstable_v2_resumeSession(existingSessionId, sessionOptions)
		: unstable_v2_createSession(sessionOptions);

	try {
		await session.send(messageToSend);

		let wroteAnyText = false;
		let observedSessionId = existingSessionId;

		for await (const msg of session.receive()) {
			if (
				!observedSessionId &&
				msg &&
				typeof msg === "object" &&
				"session_id" in msg
			) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				observedSessionId = String((msg as any).session_id || "");
			}

			if (msg.type === "auth_status") {
				if (Array.isArray(msg.output) && msg.output.length) {
					console.error(msg.output.join("\n"));
				}
				if (msg.error) {
					console.error(msg.error);
				}
			}

			if (msg.type === "stream_event") {
				const ev = msg.event as any;
				if (
					ev?.type === "content_block_delta" &&
					typeof ev?.delta?.text === "string"
				) {
					process.stdout.write(ev.delta.text);
					wroteAnyText = true;
				}
			}

			if (
				!wroteAnyText &&
				msg.type === "assistant" &&
				msg.message &&
				Array.isArray(msg.message.content)
			) {
				const text = msg.message.content
					.filter((b: any) => b && b.type === "text")
					.map((b: any) => b.text)
					.join("");
				if (text) {
					process.stdout.write(text);
					wroteAnyText = true;
				}
			}

			// A 'result' message marks the end of the current turn.
			if (msg.type === "result") {
				if (msg.subtype === "success") {
					// Some runs don't emit assistant/stream events. In that case, the final
					// user-facing text lives in msg.result.
					if (!wroteAnyText && typeof msg.result === "string" && msg.result) {
						process.stdout.write(msg.result);
						if (!msg.result.endsWith("\n")) process.stdout.write("\n");
						wroteAnyText = true;
					}
				} else {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					console.error(
						"Agent SDK error:",
						msg.subtype,
						(msg as any).errors || []
					);
				}
				break;
			}
		}

		const finalSessionId =
			observedSessionId || (session as any).sessionId || "";
		if (finalSessionId) {
			await fs.writeFile(sessionFilePath, finalSessionId, "utf-8");
		}
	} finally {
		session.close();
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
