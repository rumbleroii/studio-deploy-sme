import {
	unstable_v2_createSession,
	unstable_v2_resumeSession,
} from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs/promises";
import { createWriteStream, WriteStream } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RunEvent {
	seq: number;
	type: "delta" | "session_id" | "done" | "error";
	text?: string;
	sessionId?: string;
	error?: string;
}

interface RunMeta {
	status: "running" | "complete" | "error";
	runId: string;
	projectId: string;
	startedAt: string;
	completedAt?: string;
	sessionId?: string;
	error?: string;
	pid: number;
}

interface CallbackPayload {
	runId: string;
	projectId: string;
	status: "complete" | "error";
	content: string;
	sessionId?: string;
	error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readOptional(filePath: string): Promise<string> {
	try {
		return await fs.readFile(filePath, "utf-8");
	} catch {
		return "";
	}
}

/**
 * Make HTTP callback to the webapp with retry logic
 */
async function makeCallback(
	url: string,
	secret: string,
	payload: CallbackPayload,
	maxRetries = 3
): Promise<void> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Callback-Secret": secret,
				},
				body: JSON.stringify(payload),
			});
			if (response.ok) {
				return;
			}
			console.error(
				`Callback attempt ${attempt} failed: ${response.status} ${response.statusText}`
			);
		} catch (err) {
			console.error(`Callback attempt ${attempt} error:`, err);
		}
		if (attempt < maxRetries) {
			// Exponential backoff: 1s, 2s, 4s
			await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
		}
	}
	console.error("All callback attempts failed");
}

// ---------------------------------------------------------------------------
// Event Logger (for run-based mode)
// ---------------------------------------------------------------------------

class EventLogger {
	private seq = 0;
	private stream: WriteStream;
	private accumulatedContent = "";
	private runDir: string;
	private runId: string;
	private projectId: string;
	private sessionId?: string;
	private callbackUrl?: string;
	private callbackSecret?: string;

	constructor(
		runDir: string,
		runId: string,
		projectId: string,
		callbackUrl?: string,
		callbackSecret?: string
	) {
		this.runDir = runDir;
		this.runId = runId;
		this.projectId = projectId;
		this.callbackUrl = callbackUrl;
		this.callbackSecret = callbackSecret;
		this.stream = createWriteStream(path.join(runDir, "events.ndjson"), {
			flags: "a",
		});
	}

	private writeEvent(event: RunEvent): void {
		this.stream.write(JSON.stringify(event) + "\n");
	}

	delta(text: string): void {
		this.seq++;
		this.accumulatedContent += text;
		this.writeEvent({ seq: this.seq, type: "delta", text });
	}

	setSessionId(sessionId: string): void {
		this.sessionId = sessionId;
		this.seq++;
		this.writeEvent({ seq: this.seq, type: "session_id", sessionId });
	}

	getSessionId(): string | undefined {
		return this.sessionId;
	}

	getContent(): string {
		return this.accumulatedContent;
	}

	async done(): Promise<void> {
		this.seq++;
		this.writeEvent({ seq: this.seq, type: "done" });
		await this.finalize("complete");
	}

	async error(error: string): Promise<void> {
		this.seq++;
		this.writeEvent({ seq: this.seq, type: "error", error });
		await this.finalize("error", error);
	}

	private async finalize(
		status: "complete" | "error",
		error?: string
	): Promise<void> {
		// Close the event stream
		await new Promise<void>((resolve) => this.stream.end(resolve));

		// Write meta.json
		const meta: RunMeta = {
			status,
			runId: this.runId,
			projectId: this.projectId,
			startedAt: new Date().toISOString(), // Approximate; could track actual start
			completedAt: new Date().toISOString(),
			sessionId: this.sessionId,
			error,
			pid: process.pid,
		};
		await fs.writeFile(
			path.join(this.runDir, "meta.json"),
			JSON.stringify(meta, null, 2)
		);

		// Phase 2: Make callback to persist to DB
		if (this.callbackUrl && this.callbackSecret) {
			const payload: CallbackPayload = {
				runId: this.runId,
				projectId: this.projectId,
				status,
				content: this.accumulatedContent,
				sessionId: this.sessionId,
				error,
			};
			await makeCallback(this.callbackUrl, this.callbackSecret, payload);
		}
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		console.error("Error: ANTHROPIC_API_KEY not found in environment");
		process.exit(1);
	}

	const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
	const pathToClaudeCodeExecutable =
		process.env.CLAUDE_CODE_PATH || "/runner/node_modules/.bin/claude";

	// Run-based mode env vars
	const runId = process.env.RUN_ID;
	const projectId = process.env.PROJECT_ID || "";
	const callbackUrl = process.env.CALLBACK_URL;
	const callbackSecret = process.env.CALLBACK_SECRET;

	// Inputs live in the project workspace directory.
	const projectDir = process.cwd();

	// Create a dedicated working directory inside the project workspace.
	const workingDir = path.join(projectDir, "working_directory");
	await fs.mkdir(workingDir, { recursive: true });

	// Event logger for run-based mode
	let eventLogger: EventLogger | null = null;
	if (runId) {
		const runDir = path.join(projectDir, ".runs", runId);
		await fs.mkdir(runDir, { recursive: true });
		eventLogger = new EventLogger(
			runDir,
			runId,
			projectId,
			callbackUrl,
			callbackSecret
		);

		// Write initial meta.json with running status
		const initialMeta: RunMeta = {
			status: "running",
			runId,
			projectId,
			startedAt: new Date().toISOString(),
			pid: process.pid,
		};
		await fs.writeFile(
			path.join(runDir, "meta.json"),
			JSON.stringify(initialMeta, null, 2)
		);
	}

	// Handle SIGTERM gracefully
	let terminated = false;
	process.on("SIGTERM", async () => {
		if (terminated) return;
		terminated = true;
		if (eventLogger) {
			await eventLogger.error("Run cancelled by user");
		}
		process.exit(130);
	});

	// Copy baked-in .claude into the working directory (first run only).
	const bakedClaudeDir = "/runner/working_directory/.claude";
	const workingClaudeDir = path.join(workingDir, ".claude");
	try {
		await fs.stat(workingClaudeDir);
	} catch {
		try {
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
		const errorMsg = "Error: .current_message.txt not found";
		if (eventLogger) {
			await eventLogger.error(errorMsg);
		} else {
			console.error(errorMsg);
		}
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
	process.chdir(workingDir);

	const session = existingSessionId
		? unstable_v2_resumeSession(existingSessionId, sessionOptions)
		: unstable_v2_createSession(sessionOptions);

	try {
		await session.send(messageToSend);

		let wroteAnyText = false;
		let observedSessionId = existingSessionId;

		for await (const msg of session.receive()) {
			if (terminated) break;

			if (
				!observedSessionId &&
				msg &&
				typeof msg === "object" &&
				"session_id" in msg
			) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				observedSessionId = String((msg as any).session_id || "");
				if (observedSessionId && eventLogger) {
					eventLogger.setSessionId(observedSessionId);
				}
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const ev = msg.event as any;
				if (
					ev?.type === "content_block_delta" &&
					typeof ev?.delta?.text === "string"
				) {
					if (eventLogger) {
						eventLogger.delta(ev.delta.text);
					} else {
						process.stdout.write(ev.delta.text);
					}
					wroteAnyText = true;
				}
			}

			if (
				!wroteAnyText &&
				msg.type === "assistant" &&
				msg.message &&
				Array.isArray(msg.message.content)
			) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const text = msg.message.content
					.filter((b: any) => b && b.type === "text")
					.map((b: any) => b.text)
					.join("");
				if (text) {
					if (eventLogger) {
						eventLogger.delta(text);
					} else {
						process.stdout.write(text);
					}
					wroteAnyText = true;
				}
			}

			// A 'result' message marks the end of the current turn.
			if (msg.type === "result") {
				if (msg.subtype === "success") {
					if (!wroteAnyText && typeof msg.result === "string" && msg.result) {
						if (eventLogger) {
							eventLogger.delta(msg.result);
							if (!msg.result.endsWith("\n")) {
								eventLogger.delta("\n");
							}
						} else {
							process.stdout.write(msg.result);
							if (!msg.result.endsWith("\n")) process.stdout.write("\n");
						}
						wroteAnyText = true;
					}
				} else {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const errorMsg = `Agent SDK error: ${msg.subtype} ${JSON.stringify(
						(msg as any).errors || []
					)}`;
					console.error(errorMsg);
					if (eventLogger) {
						await eventLogger.error(errorMsg);
						session.close();
						return;
					}
				}
				break;
			}
		}

		// Update sessionId in eventLogger if we got it later
		const finalSessionId =
			observedSessionId || (session as any).sessionId || "";
		if (finalSessionId) {
			await fs.writeFile(sessionFilePath, finalSessionId, "utf-8");
			if (eventLogger && !eventLogger.getSessionId()) {
				eventLogger.setSessionId(finalSessionId);
			}
		}

		// Mark run as complete
		if (eventLogger) {
			await eventLogger.done();
		}
	} catch (err) {
		const errorMsg = `Fatal error: ${
			err instanceof Error ? err.message : String(err)
		}`;
		console.error(errorMsg);
		if (eventLogger) {
			await eventLogger.error(errorMsg);
		}
		throw err;
	} finally {
		session.close();
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
