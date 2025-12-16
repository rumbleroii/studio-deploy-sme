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
const RUN_CHAT_SCRIPT = `import { Anthropic } from "@anthropic-ai/sdk";
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

\tconst projectDir = process.cwd();
\tconst researchObjective = await readOptional(path.join(projectDir, "research_objective.md"));
\tconst userMessage = await readOptional(path.join(projectDir, ".current_message.txt"));
\tif (!userMessage) {
\t\tconsole.error("Error: .current_message.txt not found");
\t\tprocess.exit(1);
\t}

\tlet history = [];
\ttry {
\t\tconst historyData = await readOptional(path.join(projectDir, ".chat_history.json"));
\t\thistory = historyData ? JSON.parse(historyData) : [];
\t} catch {
\t\thistory = [];
\t}

\tconst client = new Anthropic({ apiKey });

\tconst systemPrompt = \`You are a research assistant. Context:\\n\${researchObjective}\`;
\tconst messages = history.map((m) => ({ role: m.role, content: m.content }));
\tmessages.push({ role: "user", content: userMessage });

\tconst stream = await client.messages.create({
\t\tmodel,
\t\tmax_tokens: 1024,
\t\tsystem: systemPrompt,
\t\tmessages,
\t\tstream: true,
\t});

\tfor await (const chunk of stream) {
\t\tif (chunk.type === "content_block_delta") {
\t\t\tprocess.stdout.write(chunk.delta.text);
\t\t}
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
