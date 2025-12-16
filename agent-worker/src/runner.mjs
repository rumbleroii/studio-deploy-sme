import {
\tunstable_v2_createSession,
\tunstable_v2_resumeSession,
} from "@anthropic-ai/claude-agent-sdk";
import fs from "fs/promises";
import path from "path";

// This script runs INSIDE the sandbox.
// It reads inputs from files written by the Worker.

async function readOptional(filePath) {
\ttry {
\t\treturn await fs.readFile(filePath, "utf-8");
\t} catch {
\t\treturn "";
\t}
}

async function main() {
	// 1. Read configuration
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		console.error("Error: ANTHROPIC_API_KEY not found in environment");
		process.exit(1);
	}

	const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
	const pathToClaudeCodeExecutable =
		process.env.CLAUDE_CODE_PATH || "/runner/node_modules/.bin/claude";

	// 2. Read context and inputs
	const projectDir = process.cwd();
	// Ensure Claude Code stores session/transcripts in the project dir so resume works.
	const claudeConfigDir = path.join(projectDir, ".claude");
	await fs.mkdir(claudeConfigDir, { recursive: true });

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
	};

	const isNewSession = !existingSessionId;
	let promptPrefix =
		"You are a research assistant. Do not use tools unless explicitly asked.\n\n";
	if (researchObjective && isNewSession) {
		promptPrefix =
			"You are a research assistant. Use the following context. Do not use tools unless explicitly asked.\n\nContext:\n" +
			researchObjective +
			"\n\n";
	}
	const perTurnPrefix = "Do not use tools unless explicitly asked.\n\n";
	const messageToSend = isNewSession
		? promptPrefix + userMessage
		: perTurnPrefix + userMessage;

	const session = existingSessionId
		? unstable_v2_resumeSession(existingSessionId, sessionOptions)
		: unstable_v2_createSession(sessionOptions);

	try {
		await session.send(messageToSend);

		let wroteAnyText = false;
		let observedSessionId = existingSessionId;

		for await (const msg of session.receive()) {
			if (!observedSessionId && msg && typeof msg === "object" && "session_id" in msg) {
				observedSessionId = String(msg.session_id || "");
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
				const ev = msg.event;
				if (
					ev &&
					ev.type === "content_block_delta" &&
					ev.delta &&
					typeof ev.delta.text === "string"
				) {
					process.stdout.write(ev.delta.text);
					wroteAnyText = true;
				}
			}

			if (!wroteAnyText && msg.type === "assistant" && msg.message && Array.isArray(msg.message.content)) {
				const text = msg.message.content
					.filter((b) => b && b.type === "text")
					.map((b) => b.text)
					.join("");
				if (text) {
					process.stdout.write(text);
					wroteAnyText = true;
				}
			}

			// A 'result' message marks the end of the current turn.
			if (msg.type === "result") {
				if (msg.subtype !== "success") {
					console.error("Agent SDK error:", msg.subtype, msg.errors || []);
				}
				break;
			}
		}

		const finalSessionId = observedSessionId || (session && session.sessionId) || "";
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
