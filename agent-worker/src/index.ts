import { getSandbox, parseSSEStream, Sandbox } from "@cloudflare/sandbox";
export { Sandbox };

interface Env {
	Sandbox: DurableObjectNamespace<Sandbox>;
	ANTHROPIC_API_KEY: string;
	AGENT_WORKER_SHARED_SECRET: string;
}

interface EnsureRequestBody {
	researchObjectiveText: string;
}

interface ChatRequestBody {
	message: string;
	history?: Array<{ role: string; content: string }>;
	researchObjectiveText: string;
	claudeSessionId?: string;
}

// SSE Event types from Cloudflare Sandbox
interface SSEEvent {
	type: "stdout" | "stderr" | "complete" | "error";
	data?: string;
	exitCode?: number;
	error?: string;
}

type SandboxInstance = ReturnType<typeof getSandbox>;

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// Keep the runner script synced even for long-lived sandboxes by writing it at runtime.
// This avoids needing every sandbox instance to restart to pick up container image changes.
const RUN_CHAT_SCRIPT = `import { unstable_v2_createSession, unstable_v2_resumeSession } from "@anthropic-ai/claude-agent-sdk";
import fs from "fs/promises";
import path from "path";

async function readOptional(filePath) {
\ttry {
\t\treturn await fs.readFile(filePath, "utf-8");
\t} catch {
\t\treturn "";
\t}
}

async function main() {
\tconst apiKey = process.env.ANTHROPIC_API_KEY;
\tif (!apiKey) {
\t\tconsole.error("Error: ANTHROPIC_API_KEY not found in environment");
\t\tprocess.exit(1);
\t}

\tconst model = process.env.ANTHROPIC_MODEL || "${DEFAULT_ANTHROPIC_MODEL}";
\tconst pathToClaudeCodeExecutable =
\t\tprocess.env.CLAUDE_CODE_PATH || "/runner/node_modules/.bin/claude";

\tconst projectDir = process.cwd();
\tconst researchObjective = await readOptional(path.join(projectDir, "research_objective.md"));
\tconst userMessage = await readOptional(path.join(projectDir, ".current_message.txt"));
\tif (!userMessage) {
\t\tconsole.error("Error: .current_message.txt not found");
\t\tprocess.exit(1);
\t}
\tconst sessionFilePath = path.join(projectDir, ".claude_session_id");
\tconst existingSessionId = (await readOptional(sessionFilePath)).trim();

\tconst sessionOptions = {
\t\tmodel,
\t\tpathToClaudeCodeExecutable,
\t\tenv: {
\t\t\t...process.env,
\t\t\tANTHROPIC_API_KEY: apiKey,
\t\t},
\t};

\tconst isNewSession = !existingSessionId;
\tlet promptPrefix =
\t\t"You are a research assistant. Do not use tools unless explicitly asked.\\n\\n";
\tif (researchObjective && isNewSession) {
\t\tpromptPrefix =
\t\t\t"You are a research assistant. Use the following context. Do not use tools unless explicitly asked.\\n\\nContext:\\n" +
\t\t\tresearchObjective +
\t\t\t"\\n\\n";
\t}
\tconst messageToSend = isNewSession ? promptPrefix + userMessage : userMessage;

\tconst session = existingSessionId
\t\t? unstable_v2_resumeSession(existingSessionId, sessionOptions)
\t\t: unstable_v2_createSession(sessionOptions);

\ttry {
\t\tawait session.send(messageToSend);

\t\tlet wroteAnyText = false;
\t\tlet observedSessionId = existingSessionId;

\t\tfor await (const msg of session.receive()) {
\t\t\tif (!observedSessionId && msg && typeof msg === "object" && "session_id" in msg) {
\t\t\t\tobservedSessionId = String(msg.session_id || "");
\t\t\t}

\t\t\tif (msg.type === "auth_status") {
\t\t\t\tif (Array.isArray(msg.output) && msg.output.length) {
\t\t\t\t\tconsole.error(msg.output.join("\\n"));
\t\t\t\t}
\t\t\t\tif (msg.error) {
\t\t\t\t\tconsole.error(msg.error);
\t\t\t\t}
\t\t\t}

\t\t\tif (msg.type === "stream_event") {
\t\t\t\tconst ev = msg.event;
\t\t\t\tif (ev && ev.type === "content_block_delta" && ev.delta && typeof ev.delta.text === "string") {
\t\t\t\t\tprocess.stdout.write(ev.delta.text);
\t\t\t\t\twroteAnyText = true;
\t\t\t\t}
\t\t\t}

\t\t\tif (!wroteAnyText && msg.type === "assistant" && msg.message && Array.isArray(msg.message.content)) {
\t\t\t\tconst text = msg.message.content
\t\t\t\t\t.filter((b) => b && b.type === "text")
\t\t\t\t\t.map((b) => b.text)
\t\t\t\t\t.join(\"\");
\t\t\t\tif (text) {
\t\t\t\t\tprocess.stdout.write(text);
\t\t\t\t\twroteAnyText = true;
\t\t\t\t}
\t\t\t}

\t\t\t// A 'result' message marks the end of the current turn.
\t\t\tif (msg.type === "result") {
\t\t\t\tif (msg.subtype !== "success") {
\t\t\t\t\tconsole.error("Agent SDK error:", msg.subtype, msg.errors || []);
\t\t\t\t}
\t\t\t\tbreak;
\t\t\t}
\t\t}

\t\tconst finalSessionId = observedSessionId || (session && session.sessionId) || \"\";
\t\tif (finalSessionId) {
\t\t\tawait fs.writeFile(sessionFilePath, finalSessionId, \"utf-8\");
\t\t}
\t} finally {
\t\tsession.close();
\t}
}

main().catch((err) => {
\tconsole.error("Fatal error:", err);
\tprocess.exit(1);
});
`;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Validate shared secret
		const secret = request.headers.get("X-Shared-Secret");
		if (secret !== env.AGENT_WORKER_SHARED_SECRET) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Route matching
		const ensureMatch = path.match(/^\/v1\/projects\/([^/]+)\/ensure$/);
		const chatMatch = path.match(/^\/v1\/projects\/([^/]+)\/chat$/);

		if (request.method === "POST" && ensureMatch) {
			if (!/^[a-zA-Z0-9_-]+$/.test(ensureMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleEnsure(ensureMatch[1], request, env);
		}

		if (request.method === "POST" && chatMatch) {
			if (!/^[a-zA-Z0-9_-]+$/.test(chatMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleChat(chatMatch[1], request, env);
		}

		return new Response(JSON.stringify({ error: "Not Found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	},
};

async function handleEnsure(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as EnsureRequestBody;
		const sandboxId = `project-${projectId}`;

		// Get or create sandbox
		const sandbox = getSandbox(env.Sandbox, sandboxId);

		// Create project workspace directory
		const projectDir = `/workspace/projects/${projectId}`;
		await sandbox.exec(`mkdir -p ${projectDir}`);

		// Ensure the runner script in /runner is up-to-date for this sandbox instance.
		// (Writing is cheap and makes deploys deterministic.)
		await sandbox.exec("mkdir -p /runner");
		await sandbox.writeFile("/runner/run_chat.mjs", RUN_CHAT_SCRIPT);

		// Write research objective if not exists
		const objectivePath = `${projectDir}/research_objective.md`;
		const checkResult = await sandbox.exec(
			`test -f ${objectivePath} && echo exists || echo missing`
		);

		if (checkResult.stdout.trim() === "missing") {
			await sandbox.writeFile(objectivePath, body.researchObjectiveText);
		}

		// Warm up the container
		await sandbox.exec("echo ready");

		return new Response(JSON.stringify({ status: "ready", sandboxId }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Ensure failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error("Error details:", { errorMessage, errorStack, projectId });
		return new Response(
			JSON.stringify({
				error: "Failed to ensure sandbox",
				details: errorMessage,
				stack: errorStack,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleChat(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as ChatRequestBody;
		const sandboxId = `project-${projectId}`;

		const sandbox = getSandbox(env.Sandbox, sandboxId);

		const projectDir = `/workspace/projects/${projectId}`;
		// Chat might be called before ensure; make sure the directory exists.
		await sandbox.exec(`mkdir -p ${projectDir}`);

		// Write the message and history to temporary files
		const messageFile = `${projectDir}/.current_message.txt`;
		const historyFile = `${projectDir}/.chat_history.json`;
		const sessionFile = `${projectDir}/.claude_session_id`;

		// Ensure runner exists even if ensure wasn't called (or sandbox is long-lived).
		await sandbox.exec("mkdir -p /runner");
		await sandbox.writeFile("/runner/run_chat.mjs", RUN_CHAT_SCRIPT);

		await sandbox.writeFile(messageFile, body.message);
		await sandbox.writeFile(historyFile, JSON.stringify(body.history || []));

		if (body.claudeSessionId) {
			await sandbox.writeFile(sessionFile, body.claudeSessionId);
		}

		// Run the baked-in chat script
		// Note: We use the pre-baked runner at /runner/run_chat.mjs
		// We pass ANTHROPIC_API_KEY as an environment variable to the exec command
		const stream = await sandbox.execStream(
			`cd ${projectDir} && node /runner/run_chat.mjs`,
			{
				env: {
					ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
					ANTHROPIC_MODEL: DEFAULT_ANTHROPIC_MODEL,
				},
			}
		);

		// Transform the sandbox SSE stream to our format
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		(async () => {
			try {
				for await (const rawEvent of parseSSEStream(stream)) {
					const event = rawEvent as SSEEvent;
					if (event.type === "stdout") {
						await writer.write(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "stdout",
									data: event.data,
								})}\n\n`
							)
						);
					} else if (event.type === "stderr") {
						// Log stderr server-side, but do not show it in the UI.
						console.log("stderr:", event.data);
					} else if (event.type === "complete") {
						// Read session ID if it was updated
						try {
							const sessionResult = await sandbox.exec(
								`cat ${sessionFile} 2>/dev/null || echo ""`
							);
							const sessionId = sessionResult.stdout.trim();
							if (sessionId) {
								await writer.write(
									encoder.encode(
										`data: ${JSON.stringify({
											type: "session_id",
											sessionId,
										})}\n\n`
									)
								);
							}
						} catch {
							// Session file doesn't exist, that's fine
						}

						await writer.write(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "complete",
									exitCode: event.exitCode,
								})}\n\n`
							)
						);
					} else if (event.type === "error") {
						await writer.write(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "error",
									error: event.error,
								})}\n\n`
							)
						);
					}
				}
			} catch (error) {
				console.error("Stream error:", error);
				await writer.write(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "error",
							error: "Stream failed",
						})}\n\n`
					)
				);
			} finally {
				await writer.close();
			}
		})();

		return new Response(readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Chat failed:", error);
		return new Response(JSON.stringify({ error: "Chat failed" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
