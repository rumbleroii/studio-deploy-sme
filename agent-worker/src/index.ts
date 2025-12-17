import {
	getSandbox,
	parseSSEStream,
	Sandbox,
	proxyToSandbox,
} from "@cloudflare/sandbox";
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

interface RunsCreateRequestBody extends ChatRequestBody {
	runId: string;
	idempotencyKey?: string;
	callbackUrl?: string;
	callbackSecret?: string;
}

interface FileWriteRequestBody {
	files: Array<{
		path: string;
		content: string;
		encoding?: "base64" | "utf-8";
	}>;
}

interface MkdirRequestBody {
	path: string;
}

interface DeleteRequestBody {
	path: string;
	kind?: "file" | "directory";
}

interface MoveRequestBody {
	sourcePath: string;
	destinationPath: string;
}

interface FileInfo {
	name: string;
	absolutePath: string;
	relativePath: string;
	type: "file" | "directory" | "symlink" | "other";
	size: number;
	modifiedAt: string;
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
const PREVIEW_PORT = 3001;
const CUSTOM_DOMAIN = "metaforms-sandbox.com";
const RUNS_DIR_NAME = ".runs";
const ACTIVE_RUN_FILE_NAME = ".active_run.json";

/**
 * Validate and resolve a relative path to an absolute path under workingDir.
 * Returns null if the path is invalid (contains .., starts with /, etc.)
 */
function resolveSecurePath(
	workingDir: string,
	relativePath: string
): string | null {
	// Normalize the path: remove leading/trailing slashes, collapse multiple slashes
	let normalized = relativePath
		.replace(/\\/g, "/")
		.replace(/\/+/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");

	// Check for path traversal attempts
	const segments = normalized.split("/");
	for (const seg of segments) {
		if (seg === ".." || seg === ".") {
			return null;
		}
	}

	// Don't allow empty paths
	if (!normalized) {
		return null;
	}

	// Check if path tries to access .claude directory (hidden config)
	if (normalized === ".claude" || normalized.startsWith(".claude/")) {
		return null;
	}

	return `${workingDir}/${normalized}`;
}

/**
 * Filter file list to exclude .claude directory and other hidden paths
 */
function filterFileList(files: FileInfo[], workingDir: string): FileInfo[] {
	return files.filter((f) => {
		const rel = f.relativePath;
		// Exclude .claude directory
		if (rel === ".claude" || rel.startsWith(".claude/")) {
			return false;
		}
		return true;
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Handle preview URLs (port-exposed sandbox requests)
		const proxyResponse = await proxyToSandbox(request, env);
		if (proxyResponse) {
			return proxyResponse;
		}

		const url = new URL(request.url);
		const path = url.pathname;

		// Validate shared secret for API requests
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
		const runsCreateMatch = path.match(/^\/v1\/projects\/([^/]+)\/runs$/);
		const runStreamMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/runs\/([^/]+)\/stream$/
		);
		const runStatusMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/runs\/([^/]+)\/status$/
		);
		const runCancelMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/runs\/([^/]+)\/cancel$/
		);
		const filesListMatch = path.match(/^\/v1\/projects\/([^/]+)\/files$/);
		const filesWriteMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/files\/write$/
		);
		const filesMkdirMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/files\/mkdir$/
		);
		const filesDeleteMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/files\/delete$/
		);
		const filesMoveMatch = path.match(/^\/v1\/projects\/([^/]+)\/files\/move$/);
		const filesDownloadMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/files\/download$/
		);
		const filesEventsMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/files\/events$/
		);

		const validateProjectId = (id: string): boolean =>
			/^[a-zA-Z0-9_-]+$/.test(id);
		const validateRunId = (id: string): boolean => /^[a-zA-Z0-9_-]+$/.test(id);

		if (request.method === "POST" && ensureMatch) {
			const projectId = ensureMatch[1];
			if (!validateProjectId(projectId)) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleEnsure(projectId, request, env);
		}

		if (request.method === "POST" && runsCreateMatch) {
			const projectId = runsCreateMatch[1];
			if (!validateProjectId(projectId)) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleRunsCreate(projectId, request, env);
		}

		if (request.method === "GET" && runStreamMatch) {
			const projectId = runStreamMatch[1];
			const runId = runStreamMatch[2];
			if (!validateProjectId(projectId) || !validateRunId(runId)) {
				return new Response(
					JSON.stringify({ error: "Invalid projectId/runId" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
			return handleRunStream(projectId, runId, request, env);
		}

		if (request.method === "GET" && runStatusMatch) {
			const projectId = runStatusMatch[1];
			const runId = runStatusMatch[2];
			if (!validateProjectId(projectId) || !validateRunId(runId)) {
				return new Response(
					JSON.stringify({ error: "Invalid projectId/runId" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
			return handleRunStatus(projectId, runId, env);
		}

		if (request.method === "POST" && runCancelMatch) {
			const projectId = runCancelMatch[1];
			const runId = runCancelMatch[2];
			if (!validateProjectId(projectId) || !validateRunId(runId)) {
				return new Response(
					JSON.stringify({ error: "Invalid projectId/runId" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
			return handleRunCancel(projectId, runId, env);
		}

		if (request.method === "POST" && chatMatch) {
			if (!validateProjectId(chatMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleChat(chatMatch[1], request, env);
		}

		// File management endpoints
		if (request.method === "GET" && filesListMatch) {
			if (!validateProjectId(filesListMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleFilesList(filesListMatch[1], env);
		}

		if (request.method === "POST" && filesWriteMatch) {
			if (!validateProjectId(filesWriteMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleFilesWrite(filesWriteMatch[1], request, env);
		}

		if (request.method === "POST" && filesMkdirMatch) {
			if (!validateProjectId(filesMkdirMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleFilesMkdir(filesMkdirMatch[1], request, env);
		}

		if (request.method === "POST" && filesDeleteMatch) {
			if (!validateProjectId(filesDeleteMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleFilesDelete(filesDeleteMatch[1], request, env);
		}

		if (request.method === "POST" && filesMoveMatch) {
			if (!validateProjectId(filesMoveMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleFilesMove(filesMoveMatch[1], request, env);
		}

		if (request.method === "GET" && filesDownloadMatch) {
			if (!validateProjectId(filesDownloadMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleFilesDownload(filesDownloadMatch[1], url, env);
		}

		if (request.method === "GET" && filesEventsMatch) {
			if (!validateProjectId(filesEventsMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleFilesEvents(filesEventsMatch[1], request, env);
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

		// Write research objective if not exists
		const objectivePath = `${projectDir}/research_objective.md`;
		const checkResult = await sandbox.exec(
			`test -f ${objectivePath} && echo exists || echo missing`
		);
		if (checkResult.stdout.trim() === "missing") {
			await sandbox.writeFile(objectivePath, body.researchObjectiveText);
		}

		// Start preview server (using baked-in hello-world.mjs)
		await sandbox.exec("pkill -f hello-world.mjs || true");
		await sandbox.exec("node /runner/hello-world.mjs &");
		await sandbox.exec("sleep 2");

		// Expose port and get public URL
		let previewUrl: string | undefined;
		try {
			const existingPorts = await sandbox.getExposedPorts(CUSTOM_DOMAIN);
			const existingPort = existingPorts.find((p) => p.port === PREVIEW_PORT);

			if (existingPort) {
				previewUrl = existingPort.url;
			} else {
				const portResult = await sandbox.exposePort(PREVIEW_PORT, {
					hostname: CUSTOM_DOMAIN,
				});
				previewUrl = portResult.url;
			}
		} catch (portError) {
			console.warn("Port exposure failed:", portError);
		}

		return new Response(
			JSON.stringify({
				status: "ready",
				sandboxId,
				previewUrl,
			}),
			{
				headers: { "Content-Type": "application/json" },
			}
		);
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

		await sandbox.writeFile(messageFile, body.message);
		await sandbox.writeFile(historyFile, JSON.stringify(body.history || []));

		if (body.claudeSessionId) {
			await sandbox.writeFile(sessionFile, body.claudeSessionId);
		}

		// Run the baked-in chat script
		// Note: We use the pre-baked runner at /runner/run_chat.js (compiled from TS)
		// We pass ANTHROPIC_API_KEY as an environment variable to the exec command
		const stream = await sandbox.execStream(
			`cd ${projectDir} && node /runner/run_chat.js`,
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

// ============================================================================
// Run-based Chat (durable/resumable)
// ============================================================================

type RunMetaStatus = "starting" | "running" | "done" | "error";

interface ActiveRunPointer {
	runId: string;
	pid: number;
	startedAt: string;
}

interface RunMeta {
	runId: string;
	status: RunMetaStatus;
	createdAt: string;
	updatedAt: string;
	startedAt?: string;
	finishedAt?: string;
	pid?: number;
	lastSeq?: number;
	lastEventAt?: string;
	sessionId?: string;
	error?: string;
}

function getProjectDir(projectId: string): string {
	return `/workspace/projects/${projectId}`;
}

function getActiveRunPath(projectDir: string): string {
	return `${projectDir}/${ACTIVE_RUN_FILE_NAME}`;
}

function getRunDir(projectDir: string, runId: string): string {
	return `${projectDir}/${RUNS_DIR_NAME}/${runId}`;
}

function getRunEventsPath(projectDir: string, runId: string): string {
	return `${getRunDir(projectDir, runId)}/events.ndjson`;
}

function getRunMetaPath(projectDir: string, runId: string): string {
	return `${getRunDir(projectDir, runId)}/meta.json`;
}

async function readJsonViaCat<T>(
	sandbox: SandboxInstance,
	filePath: string
): Promise<T | null> {
	const result = await sandbox.exec(
		`test -f ${filePath} && cat ${filePath} || echo ""`
	);
	const raw = result.stdout.trim();
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

async function isPidRunning(
	sandbox: SandboxInstance,
	pid: number
): Promise<boolean> {
	if (!pid || !Number.isFinite(pid)) return false;
	const result = await sandbox.exec(
		`kill -0 ${pid} 2>/dev/null && echo RUNNING || echo NOT_RUNNING`
	);
	return result.stdout.trim() === "RUNNING";
}

async function clearActiveRunPointer(
	sandbox: SandboxInstance,
	projectDir: string
): Promise<void> {
	const activePath = getActiveRunPath(projectDir);
	await sandbox.exec(`rm -f ${activePath}`);
}

async function getActiveRunPointer(
	sandbox: SandboxInstance,
	projectDir: string
): Promise<ActiveRunPointer | null> {
	return await readJsonViaCat<ActiveRunPointer>(
		sandbox,
		getActiveRunPath(projectDir)
	);
}

async function handleRunsCreate(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as RunsCreateRequestBody;
		if (!body?.runId || !body?.message) {
			return new Response(
				JSON.stringify({ error: "runId and message are required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const projectDir = getProjectDir(projectId);
		await sandbox.exec(`mkdir -p ${projectDir}`);

		// Ensure research objective exists (chat may be called before /ensure).
		const objectivePath = `${projectDir}/research_objective.md`;
		const checkObjective = await sandbox.exec(
			`test -f ${objectivePath} && echo exists || echo missing`
		);
		if (checkObjective.stdout.trim() === "missing") {
			await sandbox.writeFile(objectivePath, body.researchObjectiveText || "");
		}

		// Enforce single active run per project via .active_run.json + pid liveness.
		const active = await getActiveRunPointer(sandbox, projectDir);
		if (active?.pid && (await isPidRunning(sandbox, active.pid))) {
			// Idempotency: allow repeating the same runId.
			if (active.runId === body.runId) {
				return new Response(JSON.stringify({ runId: body.runId }), {
					headers: { "Content-Type": "application/json" },
				});
			}
			return new Response(
				JSON.stringify({
					error: "Run already active",
					activeRunId: active.runId,
				}),
				{
					status: 409,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
		// Stale pointer
		if (active) {
			await clearActiveRunPointer(sandbox, projectDir);
		}

		// Prepare run directory + files
		const runDir = getRunDir(projectDir, body.runId);
		const eventsPath = getRunEventsPath(projectDir, body.runId);
		const metaPath = getRunMetaPath(projectDir, body.runId);
		await sandbox.exec(`mkdir -p ${runDir}`);
		await sandbox.exec(`touch ${eventsPath}`);

		const nowIso = new Date().toISOString();
		const initialMeta: RunMeta = {
			runId: body.runId,
			status: "starting",
			createdAt: nowIso,
			updatedAt: nowIso,
			lastSeq: 0,
			lastEventAt: nowIso,
			sessionId: body.claudeSessionId,
		};
		await sandbox.writeFile(metaPath, JSON.stringify(initialMeta));

		// Write inputs (shared across turns, but enforced single-active-run).
		const messageFile = `${projectDir}/.current_message.txt`;
		const historyFile = `${projectDir}/.chat_history.json`;
		const sessionFile = `${projectDir}/.claude_session_id`;

		await sandbox.writeFile(messageFile, body.message);
		await sandbox.writeFile(historyFile, JSON.stringify(body.history || []));
		if (body.claudeSessionId) {
			await sandbox.writeFile(sessionFile, body.claudeSessionId);
		}

		// Start runner detached and capture pid.
		const stdoutLogPath = `${runDir}/runner.stdout.log`;
		const stderrLogPath = `${runDir}/runner.stderr.log`;

		// Build environment for the runner
		const runnerEnv: Record<string, string> = {
			ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
			ANTHROPIC_MODEL: DEFAULT_ANTHROPIC_MODEL,
			RUN_ID: body.runId,
			PROJECT_ID: projectId,
		};
		if (body.callbackUrl) {
			runnerEnv.CALLBACK_URL = body.callbackUrl;
		}
		if (body.callbackSecret) {
			runnerEnv.CALLBACK_SECRET = body.callbackSecret;
		}

		const startResult = await sandbox.exec(
			`cd ${projectDir} && (node /runner/run_chat.js > ${stdoutLogPath} 2> ${stderrLogPath} & echo $!)`,
			{
				env: runnerEnv,
			} as any
		);
		const pid = Number(startResult.stdout.trim());
		if (!pid || !Number.isFinite(pid)) {
			await sandbox.writeFile(
				metaPath,
				JSON.stringify({
					...initialMeta,
					status: "error",
					updatedAt: new Date().toISOString(),
					error: "Failed to start runner (no pid)",
				} satisfies RunMeta)
			);
			return new Response(JSON.stringify({ error: "Failed to start run" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Persist active run pointer
		const activePath = getActiveRunPath(projectDir);
		const pointer: ActiveRunPointer = {
			runId: body.runId,
			pid,
			startedAt: nowIso,
		};
		await sandbox.writeFile(activePath, JSON.stringify(pointer));

		// Update meta with pid/status
		await sandbox.writeFile(
			metaPath,
			JSON.stringify({
				...initialMeta,
				status: "running",
				pid,
				startedAt: nowIso,
				updatedAt: new Date().toISOString(),
			} satisfies RunMeta)
		);

		return new Response(JSON.stringify({ runId: body.runId }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Runs create failed:", error);
		return new Response(JSON.stringify({ error: "Failed to start run" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

async function handleRunStatus(
	projectId: string,
	runId: string,
	env: Env
): Promise<Response> {
	try {
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const projectDir = getProjectDir(projectId);
		const metaPath = getRunMetaPath(projectDir, runId);
		const eventsPath = getRunEventsPath(projectDir, runId);

		const meta = await readJsonViaCat<RunMeta>(sandbox, metaPath);
		if (!meta) {
			return new Response(JSON.stringify({ error: "Run not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Best-effort lastSeq (line count). If the file is missing, treat as 0.
		const wc = await sandbox.exec(
			`test -f ${eventsPath} && wc -l < ${eventsPath} || echo 0`
		);
		const lastSeq = Number(wc.stdout.trim()) || 0;

		// Stale active run pointer cleanup
		const active = await getActiveRunPointer(sandbox, projectDir);
		if (active?.runId === runId && active.pid) {
			const running = await isPidRunning(sandbox, active.pid);
			if (!running && meta.status === "running") {
				// If the pid died unexpectedly, mark as error.
				const updatedMeta: RunMeta = {
					...meta,
					status: "error",
					updatedAt: new Date().toISOString(),
					finishedAt: new Date().toISOString(),
					error: meta.error || "Runner exited unexpectedly",
					lastSeq,
				};
				await sandbox.writeFile(metaPath, JSON.stringify(updatedMeta));
				await clearActiveRunPointer(sandbox, projectDir);
				return new Response(
					JSON.stringify({
						status: updatedMeta.status,
						lastSeq,
						sessionId: updatedMeta.sessionId,
						error: updatedMeta.error,
					}),
					{ headers: { "Content-Type": "application/json" } }
				);
			}
		}

		return new Response(
			JSON.stringify({
				status: meta.status,
				lastSeq,
				sessionId: meta.sessionId,
				error: meta.error,
			}),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error("Run status failed:", error);
		return new Response(JSON.stringify({ error: "Failed to get run status" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

async function handleRunCancel(
	projectId: string,
	runId: string,
	env: Env
): Promise<Response> {
	try {
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const projectDir = getProjectDir(projectId);

		const active = await getActiveRunPointer(sandbox, projectDir);
		if (!active || active.runId !== runId) {
			// If it's already inactive, treat as idempotent success.
			return new Response(JSON.stringify({ ok: true }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		if (active.pid && (await isPidRunning(sandbox, active.pid))) {
			await sandbox.exec(`kill -TERM ${active.pid} 2>/dev/null || true`);
		}

		await clearActiveRunPointer(sandbox, projectDir);

		return new Response(JSON.stringify({ ok: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Run cancel failed:", error);
		return new Response(JSON.stringify({ error: "Failed to cancel run" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

async function handleRunStream(
	projectId: string,
	runId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const projectDir = getProjectDir(projectId);
		const eventsPath = getRunEventsPath(projectDir, runId);

		// Determine starting seq
		const url = new URL(request.url);
		const fromSeqParam = url.searchParams.get("fromSeq");
		const lastEventIdHeader = request.headers.get("Last-Event-ID");
		const fromSeq = Number(fromSeqParam || lastEventIdHeader || "0") || 0;
		const startLine = Math.max(1, fromSeq + 1);

		// Ensure events file exists so tail doesn't error.
		await sandbox.exec(
			`mkdir -p ${getRunDir(projectDir, runId)} && touch ${eventsPath}`
		);

		// NOTE: @cloudflare/sandbox does not support passing AbortSignal across the DO boundary
		// ("AbortSignal serialization is not enabled."). Do not pass `signal` to execStream.
		// Instead, run a bounded tail process and stop emitting to the client on disconnect.
		const clientAborted = { value: false };
		request.signal.addEventListener("abort", () => {
			clientAborted.value = true;
		});

		const tailStream = await sandbox.execStream(
			`sh -c 'tail -n +${startLine} -f ${eventsPath} & pid=$!; sleep 600; kill $pid 2>/dev/null || true'`
		);

		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		let closed = false;
		const close = async () => {
			if (closed) return;
			closed = true;
			try {
				await writer.close();
			} catch {}
		};

		// Heartbeats to keep intermediaries alive
		const pingInterval = setInterval(() => {
			if (closed) return;
			writer.write(encoder.encode(`event: ping\ndata: {}\n\n`)).catch(() => {});
		}, 15000);

		(async () => {
			let buffer = "";
			try {
				for await (const rawEvent of parseSSEStream(tailStream)) {
					if (clientAborted.value) {
						break;
					}
					const event = rawEvent as SSEEvent;
					if (event.type === "stderr" && event.data) {
						// Keep server-side only
						console.log("run stream stderr:", event.data);
						continue;
					}
					if (event.type !== "stdout" || !event.data) continue;

					buffer += event.data;
					let idx: number;
					while ((idx = buffer.indexOf("\n")) !== -1) {
						const line = buffer.slice(0, idx).trim();
						buffer = buffer.slice(idx + 1);
						if (!line) continue;

						let payload: any;
						try {
							payload = JSON.parse(line);
						} catch {
							continue;
						}

						const seq = Number(payload?.seq);
						const type = String(payload?.type || "message");
						await writer.write(
							encoder.encode(
								`id: ${
									Number.isFinite(seq) ? seq : ""
								}\nevent: ${type}\ndata: ${JSON.stringify(payload)}\n\n`
							)
						);

						if (type === "done" || type === "error") {
							await close();
							return;
						}
					}
				}
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					console.error("Run stream error:", error);
					try {
						await writer.write(
							encoder.encode(
								`event: error\ndata: ${JSON.stringify({
									seq: -1,
									type: "error",
									error: "Stream failed",
								})}\n\n`
							)
						);
					} catch {}
				}
			} finally {
				clearInterval(pingInterval);
				await close();
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
		console.error("Run stream failed:", error);
		return new Response(JSON.stringify({ error: "Failed to stream run" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

// ============================================================================
// File Management Handlers
// ============================================================================

function getWorkingDir(projectId: string): string {
	return `/workspace/projects/${projectId}/working_directory`;
}

async function handleFilesList(projectId: string, env: Env): Promise<Response> {
	try {
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const workingDir = getWorkingDir(projectId);

		// Ensure directory exists
		await sandbox.exec(`mkdir -p ${workingDir}`);

		const result = await sandbox.listFiles(workingDir, {
			recursive: true,
			includeHidden: false,
		});

		// Filter out .claude directory
		const filteredFiles = filterFileList(
			result.files as FileInfo[],
			workingDir
		);

		return new Response(
			JSON.stringify({
				files: filteredFiles,
				count: filteredFiles.length,
				workingDir,
			}),
			{
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("Files list failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({ error: "Failed to list files", details: errorMessage }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleFilesWrite(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as FileWriteRequestBody;
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const workingDir = getWorkingDir(projectId);

		// Ensure working directory exists
		await sandbox.exec(`mkdir -p ${workingDir}`);

		if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
			return new Response(JSON.stringify({ error: "No files provided" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const results: Array<{ path: string; success: boolean; error?: string }> =
			[];

		for (const file of body.files) {
			const absolutePath = resolveSecurePath(workingDir, file.path);
			if (!absolutePath) {
				results.push({
					path: file.path,
					success: false,
					error: "Invalid path",
				});
				continue;
			}

			try {
				// Create parent directories if needed
				const parentDir = absolutePath.substring(
					0,
					absolutePath.lastIndexOf("/")
				);
				if (parentDir && parentDir !== workingDir) {
					await sandbox.mkdir(parentDir, { recursive: true });
				}

				// Write the file
				const encoding = file.encoding || "utf-8";
				await sandbox.writeFile(absolutePath, file.content, { encoding });

				results.push({ path: file.path, success: true });
			} catch (err) {
				results.push({
					path: file.path,
					success: false,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}

		const allSuccess = results.every((r) => r.success);
		return new Response(
			JSON.stringify({
				success: allSuccess,
				results,
			}),
			{
				status: allSuccess ? 200 : 207,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("Files write failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({ error: "Failed to write files", details: errorMessage }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleFilesMkdir(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as MkdirRequestBody;
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const workingDir = getWorkingDir(projectId);

		if (!body.path) {
			return new Response(JSON.stringify({ error: "Path is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const absolutePath = resolveSecurePath(workingDir, body.path);
		if (!absolutePath) {
			return new Response(JSON.stringify({ error: "Invalid path" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		await sandbox.mkdir(absolutePath, { recursive: true });

		return new Response(JSON.stringify({ success: true, path: body.path }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Files mkdir failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({
				error: "Failed to create directory",
				details: errorMessage,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleFilesDelete(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as DeleteRequestBody;
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const workingDir = getWorkingDir(projectId);

		if (!body.path) {
			return new Response(JSON.stringify({ error: "Path is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const absolutePath = resolveSecurePath(workingDir, body.path);
		if (!absolutePath) {
			return new Response(JSON.stringify({ error: "Invalid path" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Check if it's a directory
		if (body.kind === "directory") {
			// Use rm -rf for directories (sandbox.deleteFile only works for files)
			await sandbox.exec(`rm -rf "${absolutePath}"`);
		} else {
			await sandbox.deleteFile(absolutePath);
		}

		return new Response(JSON.stringify({ success: true, path: body.path }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Files delete failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({ error: "Failed to delete", details: errorMessage }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleFilesMove(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as MoveRequestBody;
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const workingDir = getWorkingDir(projectId);

		if (!body.sourcePath || !body.destinationPath) {
			return new Response(
				JSON.stringify({ error: "Source and destination paths are required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const absoluteSourcePath = resolveSecurePath(workingDir, body.sourcePath);
		const absoluteDestPath = resolveSecurePath(
			workingDir,
			body.destinationPath
		);

		if (!absoluteSourcePath || !absoluteDestPath) {
			return new Response(JSON.stringify({ error: "Invalid path" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Check if source exists
		const sourceExists = await sandbox.exists(absoluteSourcePath);
		if (!sourceExists) {
			return new Response(
				JSON.stringify({ error: "Source path does not exist" }),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// Ensure destination directory exists
		const destDir = absoluteDestPath.substring(
			0,
			absoluteDestPath.lastIndexOf("/")
		);
		if (destDir && destDir !== workingDir) {
			await sandbox.exec(`mkdir -p "${destDir}"`);
		}

		// Move the file/directory using mv command
		await sandbox.exec(`mv "${absoluteSourcePath}" "${absoluteDestPath}"`);

		return new Response(
			JSON.stringify({
				success: true,
				sourcePath: body.sourcePath,
				destinationPath: body.destinationPath,
			}),
			{
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("Files move failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({ error: "Failed to move file", details: errorMessage }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleFilesDownload(
	projectId: string,
	url: URL,
	env: Env
): Promise<Response> {
	try {
		const filePath = url.searchParams.get("path");
		if (!filePath) {
			return new Response(
				JSON.stringify({ error: "Path query parameter is required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const workingDir = getWorkingDir(projectId);

		const absolutePath = resolveSecurePath(workingDir, filePath);
		if (!absolutePath) {
			return new Response(JSON.stringify({ error: "Invalid path" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Check if file exists
		const existsResult = await sandbox.exists(absolutePath);
		if (!existsResult.exists) {
			return new Response(JSON.stringify({ error: "File not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Stream the file
		const stream = await sandbox.readFileStream(absolutePath);

		// Get filename for Content-Disposition
		const filename = filePath.split("/").pop() || "download";

		return new Response(stream, {
			headers: {
				"Content-Type": "application/octet-stream",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error("Files download failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({
				error: "Failed to download file",
				details: errorMessage,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleFilesEvents(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const workingDir = getWorkingDir(projectId);

		// Ensure directory exists
		await sandbox.exec(`mkdir -p ${workingDir}`);

		// Start inotifywait to watch for file system events
		// -m = monitor mode (continuous)
		// -r = recursive
		// -e = events to watch
		// --format = output format
		// NOTE: Do not pass AbortSignal to execStream; it is not serializable across DO boundary.
		// Run a bounded watcher process instead.
		const stream = await sandbox.execStream(
			`sh -c '(inotifywait -m -r -e create,delete,modify,move --format "%e %w%f" "${workingDir}" 2>/dev/null || echo "WATCHER_UNAVAILABLE") & pid=$!; sleep 600; kill $pid 2>/dev/null || true'`
		);

		// Transform the sandbox SSE stream to our fs_event format
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		(async () => {
			try {
				for await (const rawEvent of parseSSEStream(stream)) {
					const event = rawEvent as SSEEvent;
					if (event.type === "stdout" && event.data) {
						const lines = event.data.split("\n").filter(Boolean);
						for (const line of lines) {
							// Check if watcher is unavailable
							if (line.trim() === "WATCHER_UNAVAILABLE") {
								await writer.write(
									encoder.encode(
										`data: ${JSON.stringify({
											type: "error",
											error: "File watcher not available",
										})}\n\n`
									)
								);
								continue;
							}

							// Parse inotifywait output: "EVENT /path/to/file"
							const spaceIndex = line.indexOf(" ");
							if (spaceIndex === -1) continue;

							const eventType = line.substring(0, spaceIndex);
							const fullPath = line.substring(spaceIndex + 1);

							// Get relative path
							const relativePath = fullPath.startsWith(workingDir + "/")
								? fullPath.substring(workingDir.length + 1)
								: fullPath;

							// Skip .claude directory events
							if (
								relativePath === ".claude" ||
								relativePath.startsWith(".claude/")
							) {
								continue;
							}

							// Determine operation type
							let op: "create" | "delete" | "modify" | "move" = "modify";
							if (eventType.includes("CREATE")) op = "create";
							else if (eventType.includes("DELETE")) op = "delete";
							else if (eventType.includes("MOVED")) op = "move";
							else if (eventType.includes("MODIFY")) op = "modify";

							const isDir = eventType.includes("ISDIR");

							await writer.write(
								encoder.encode(
									`data: ${JSON.stringify({
										type: "fs_event",
										op,
										path: relativePath,
										isDir,
									})}\n\n`
								)
							);
						}
					} else if (event.type === "complete") {
						await writer.write(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "complete",
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
				// Likely aborted by client disconnect
				if ((error as Error).name !== "AbortError") {
					console.error("Files events stream error:", error);
				}
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
		console.error("Files events failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({
				error: "Failed to start file watcher",
				details: errorMessage,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
