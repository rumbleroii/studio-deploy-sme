import {
	getSandbox,
	parseSSEStream,
	Sandbox,
	proxyToSandbox,
} from "@cloudflare/sandbox";
export { Sandbox };

// OpenCode server runs on port 4096 inside the container
const OPENCODE_PORT = 4096;

interface Env {
	Sandbox: DurableObjectNamespace<Sandbox>;
	AGENT_WORKER_SHARED_SECRET: string;
	ANTHROPIC_API_KEY: string;
}

interface ChatRequestBody {
	message: string;
	history?: Array<{ role: string; content: string }>;
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

interface TerminalRequestBody {
	cols?: number;
	rows?: number;
}

interface TerminalInputRequestBody {
	input: string;
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

const PREVIEW_PORT = 3001;
const CUSTOM_DOMAIN = "metaforms-sandbox.com";

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

	return `${workingDir}/${normalized}`;
}

/**
 * Filter file list to exclude hidden paths
 */
function filterFileList(files: FileInfo[], workingDir: string): FileInfo[] {
	return files.filter((f) => {
		const rel = f.relativePath;
		// Exclude hidden files/directories (starting with .)
		if (rel.startsWith(".") || rel.includes("/.")) {
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
		const terminalMatch = path.match(/^\/v1\/projects\/([^/]+)\/terminal$/);
		const terminalInputMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/terminal\/input$/
		);

		const validateProjectId = (id: string): boolean =>
			/^[a-zA-Z0-9_-]+$/.test(id);

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

		if (request.method === "POST" && chatMatch) {
			const projectId = chatMatch[1];
			if (!validateProjectId(projectId)) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleChat(projectId, request, env);
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

		if (request.method === "POST" && terminalMatch) {
			if (!validateProjectId(terminalMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleTerminal(terminalMatch[1], request, env);
		}

		if (request.method === "POST" && terminalInputMatch) {
			if (!validateProjectId(terminalInputMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleTerminalInput(terminalInputMatch[1], request, env);
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
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const appDir = getAppDir(projectId);
		const userFilesDir = getUserFilesDir(projectId);

		// Create directories
		await sandbox.exec(`mkdir -p ${userFilesDir} ${appDir}`);

		// Copy survey app if not already present
		const checkApp = await sandbox.exec(`test -f ${appDir}/package.json`);
		if (checkApp.exitCode !== 0) {
			await sandbox.exec(`cp -r /runner/survey-app/. ${appDir}/`);
		}

		// Create symlink so OpenCode can access user_files from within app directory
		// user_files is at ../user_files relative to app
		await sandbox.exec(`ln -sfn ${userFilesDir} ${appDir}/user_files`);

		// Start dev server with STRICT port binding (no fallback ports)
		// Step 1: Kill anything on the assigned port
		await sandbox.exec(`lsof -ti :${PREVIEW_PORT} | xargs kill -9 2>/dev/null || true`);
		
		// Step 2: Start server (PORT and hostname already in package.json)
		await sandbox.exec(`cd ${appDir} && npm run dev -- --turbo &`);
		
		// Step 3: Health check or die
		let serverReady = false;
		for (let i = 0; i < 20; i++) {
			await sandbox.exec("sleep 1");
			const check = await sandbox.exec(`curl -s -o /dev/null -w '%{http_code}' http://localhost:${PREVIEW_PORT}`);
			if (check.stdout.trim() !== '000') {
				serverReady = true;
				break;
			}
		}
		
		if (!serverReady) {
			throw new Error(`Dev server did not bind to assigned port ${PREVIEW_PORT}`);
		}

		// Start OpenCode server in background (for chat functionality)
		await ensureOpencodeServer(sandbox, appDir, env.ANTHROPIC_API_KEY);

		// Expose port
		let previewUrl: string | undefined;
		try {
			const ports = await sandbox.getExposedPorts(CUSTOM_DOMAIN);
			const existing = ports.find((p) => p.port === PREVIEW_PORT);
			previewUrl = existing?.url ?? (await sandbox.exposePort(PREVIEW_PORT, { hostname: CUSTOM_DOMAIN })).url;
		} catch {}

		return new Response(
			JSON.stringify({ status: "ready", sandboxId, previewUrl }),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error("Ensure failed:", error);
		return new Response(
			JSON.stringify({ error: "Failed to ensure sandbox", details: String(error) }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}

// ============================================================================
// Chat Handler (Direct OpenCode HTTP API)
// ============================================================================

// Store OpenCode session IDs per project
const opencodeSessions = new Map<string, string>();

// Helper to start OpenCode server if not running
async function ensureOpencodeServer(
	sandbox: ReturnType<typeof getSandbox>,
	appDir: string,
	apiKey: string
): Promise<void> {
	const checkResult = await sandbox.exec(
		`curl -s http://127.0.0.1:${OPENCODE_PORT}/ 2>/dev/null || echo "NOT_RUNNING"`
	);

	if (checkResult.stdout?.includes("NOT_RUNNING") || checkResult.stdout?.includes("Connection refused")) {
		await sandbox.exec(
			`cd "${appDir}" && ANTHROPIC_API_KEY="${apiKey}" nohup opencode serve --port ${OPENCODE_PORT} > /tmp/opencode.log 2>&1 &`
		);
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}
}

async function handleChat(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as ChatRequestBody;
		if (!body.message) {
			return new Response(JSON.stringify({ error: "Message required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const appDir = getAppDir(projectId);

		// OpenCode server is started in handleEnsure, but check just in case
		// (container might have restarted between ensure and chat)
		await ensureOpencodeServer(sandbox, appDir, env.ANTHROPIC_API_KEY);

		// Helper to create a new session
		const createNewSession = async (): Promise<string> => {
			const createCmd = `curl -s -X POST "http://127.0.0.1:${OPENCODE_PORT}/session?directory=${encodeURIComponent(appDir)}" -H "Content-Type: application/json" -d '{"title":"Project ${projectId}"}'`;
			const createResult = await sandbox.exec(createCmd);

			if (createResult.exitCode !== 0 || !createResult.stdout) {
				throw new Error(
					`Failed to create session: ${createResult.stderr || createResult.stdout}`
				);
			}

			const sessionData = JSON.parse(createResult.stdout);
			const newId = sessionData.id || sessionData.ID || sessionData.sessionId;
			if (!newId) {
				throw new Error(`No session ID in response: ${createResult.stdout}`);
			}
			opencodeSessions.set(projectId, newId);
			return newId;
		};

		// Get or create session for this project
		let sessionId = opencodeSessions.get(projectId);
		if (!sessionId) {
			sessionId = await createNewSession();
		}

		// Stream response using SSE for real-time updates
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		(async () => {
			try {
				// Connect to OpenCode event stream
				const eventStream = await sandbox.execStream(
					`curl -sN "http://127.0.0.1:${OPENCODE_PORT}/event"`
				);

				// Track state
				let messageComplete = false;
				const partTextMap = new Map<string, string>();

				// Send the message (async)
				const promptBody = JSON.stringify({
					model: {
						providerID: "anthropic",
						modelID: "claude-sonnet-4-20250514",
					},
					parts: [{ type: "text", text: body.message }],
				}).replace(/'/g, "'\\''");

				const messagePromise = sandbox.exec(
					`curl -s -X POST "http://127.0.0.1:${OPENCODE_PORT}/session/${sessionId}/message?directory=${encodeURIComponent(appDir)}" -H "Content-Type: application/json" -d '${promptBody}'`
				);

				// Process SSE events
				let sseBuffer = "";
				for await (const rawEvent of parseSSEStream(eventStream)) {
					if (messageComplete) break;
					const event = rawEvent as SSEEvent;

					if (event.type === "stdout" && event.data) {
						sseBuffer += event.data;
						const events = sseBuffer.split("\n\n");
						sseBuffer = events.pop() || "";

						for (const sseEvent of events) {
							if (!sseEvent.trim()) continue;

							// Parse SSE data
							let eventData = "";
							for (const line of sseEvent.split("\n")) {
								if (line.startsWith("data: ")) {
									eventData = line.slice(6);
								}
							}
							if (!eventData) continue;

							try {
								const data = JSON.parse(eventData);

								// Text streaming
								if (data.type === "message.part.updated" && data.properties?.part?.type === "text") {
									const part = data.properties.part;
									const fullText = part.text || "";
									const previousText = partTextMap.get(part.id) || "";

									if (fullText.length > previousText.length) {
										let delta = fullText.slice(previousText.length);
										partTextMap.set(part.id, fullText);

										// Strip user message if at start
										if (previousText.length === 0) {
											const userMsg = body.message.trim();
											if (delta.startsWith(userMsg)) {
												delta = delta.slice(userMsg.length).trimStart();
											}
										}

										if (delta) {
											await writer.write(
												encoder.encode(`data: ${JSON.stringify({ type: "delta", text: delta })}\n\n`)
											);
										}
									}
								}
								// Tool events - partType="tool" with state.status
								else if (data.type === "message.part.updated" && data.properties?.part?.type === "tool") {
									const part = data.properties.part;
									const toolName = part.tool || "tool";
									const status = part.state?.status;

									if (status === "pending" || status === "running") {
										// Only send tool_start once per tool call
										const toolKey = part.callID || part.id;
										if (!partTextMap.has(`tool_${toolKey}`)) {
											partTextMap.set(`tool_${toolKey}`, "started");
											await writer.write(
												encoder.encode(`data: ${JSON.stringify({ type: "tool_start", tool: toolName })}\n\n`)
											);
										}
									} else if (status === "completed") {
										await writer.write(
											encoder.encode(`data: ${JSON.stringify({ type: "tool_end", tool: toolName })}\n\n`)
										);
									}
								}
								// Session idle = complete
								else if (data.type === "session.idle" || 
									(data.type === "session.status" && data.properties?.status?.type === "idle")) {
									messageComplete = true;
								}
								// Session errors
								else if (data.type === "error" || data.name === "SessionNotFoundError") {
									throw new Error(data.message || data.error || "Session error");
								}
							} catch (e) {
								if (!(e instanceof SyntaxError)) throw e;
							}
						}
					} else if (event.type === "error") {
						throw new Error(`Stream error: ${event.error}`);
					} else if (event.type === "complete") {
						break;
					}
				}

				// Wait for message to complete and check for errors
				const messageResult = await messagePromise;
				if (messageResult.stdout) {
					try {
						const result = JSON.parse(messageResult.stdout);
						if (result.name === "SessionNotFoundError" || result.error?.includes("session")) {
							opencodeSessions.delete(projectId);
							throw new Error("Session expired, please retry");
						}

						// Fallback: if no text was streamed, use POST response
						if (partTextMap.size === 0 && result.parts) {
							for (const part of result.parts) {
								if (part.type === "text" && part.text) {
									let text = part.text;
									const userMsg = body.message.trim();
									if (text.startsWith(userMsg)) {
										text = text.slice(userMsg.length).trimStart();
									}
									if (text) {
										await writer.write(
											encoder.encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`)
										);
									}
								}
							}
						}
					} catch (e) {
						// Ignore parse errors
					}
				}

				await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "session_id", sessionId })}\n\n`));
				await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
			} catch (error) {
				console.error("Chat error:", error);
				if (String(error).toLowerCase().includes("session")) {
					opencodeSessions.delete(projectId);
				}
				await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`));
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
		return new Response(
			JSON.stringify({ error: "Chat failed", details: String(error) }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}

// ============================================================================
// File Management Handlers
// ============================================================================

function getWorkingDir(projectId: string): string {
	return `/workspace/projects/${projectId}/working_directory`;
}

function getUserFilesDir(projectId: string): string {
	return `/workspace/projects/${projectId}/working_directory/user_files`;
}

function getAppDir(projectId: string): string {
	return `/workspace/projects/${projectId}/working_directory/app`;
}

async function handleFilesList(projectId: string, env: Env): Promise<Response> {
	try {
		const sandboxId = `project-${projectId}`;
		const sandbox = getSandbox(env.Sandbox, sandboxId);
		const userFilesDir = getUserFilesDir(projectId);

		// Ensure directory exists
		await sandbox.exec(`mkdir -p ${userFilesDir}`);

		const result = await sandbox.listFiles(userFilesDir, {
			recursive: true,
			includeHidden: false,
		});

		// Filter out hidden directories
		const filteredFiles = filterFileList(
			result.files as FileInfo[],
			userFilesDir
		);

		return new Response(
			JSON.stringify({
				files: filteredFiles,
				count: filteredFiles.length,
				workingDir: userFilesDir,
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
		const userFilesDir = getUserFilesDir(projectId);

		// Ensure user files directory exists
		await sandbox.exec(`mkdir -p ${userFilesDir}`);

		if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
			return new Response(JSON.stringify({ error: "No files provided" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const results: Array<{ path: string; success: boolean; error?: string }> =
			[];

		for (const file of body.files) {
			const absolutePath = resolveSecurePath(userFilesDir, file.path);
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
				if (parentDir && parentDir !== userFilesDir) {
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
		const userFilesDir = getUserFilesDir(projectId);

		if (!body.path) {
			return new Response(JSON.stringify({ error: "Path is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const absolutePath = resolveSecurePath(userFilesDir, body.path);
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
		const userFilesDir = getUserFilesDir(projectId);

		if (!body.path) {
			return new Response(JSON.stringify({ error: "Path is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const absolutePath = resolveSecurePath(userFilesDir, body.path);
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
		const userFilesDir = getUserFilesDir(projectId);

		if (!body.sourcePath || !body.destinationPath) {
			return new Response(
				JSON.stringify({ error: "Source and destination paths are required" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		const absoluteSourcePath = resolveSecurePath(userFilesDir, body.sourcePath);
		const absoluteDestPath = resolveSecurePath(
			userFilesDir,
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
		if (destDir && destDir !== userFilesDir) {
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
		const userFilesDir = getUserFilesDir(projectId);

		const absolutePath = resolveSecurePath(userFilesDir, filePath);
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
		const userFilesDir = getUserFilesDir(projectId);

		// Ensure directory exists
		await sandbox.exec(`mkdir -p ${userFilesDir}`);

		// Start inotifywait to watch for file system events
		// -m = monitor mode (continuous)
		// -r = recursive
		// -e = events to watch
		// --format = output format
		// NOTE: Do not pass AbortSignal to execStream; it is not serializable across DO boundary.
		// Run a bounded watcher process instead.
		const stream = await sandbox.execStream(
			`sh -c '(inotifywait -m -r -e create,delete,modify,move --format "%e %w%f" "${userFilesDir}" 2>/dev/null || echo "WATCHER_UNAVAILABLE") & pid=$!; sleep 600; kill $pid 2>/dev/null || true'`
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
							const relativePath = fullPath.startsWith(userFilesDir + "/")
								? fullPath.substring(userFilesDir.length + 1)
								: fullPath;

							// Skip hidden files/directories
							if (
								relativePath.startsWith(".") ||
								relativePath.includes("/.")
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

// Helper function to get the terminal input FIFO path for a project
function getTerminalInputFifo(projectId: string): string {
	return `/runner/projects/${projectId}/.terminal_input`;
}

async function handleTerminal(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as TerminalRequestBody;
		const sandbox = getSandbox(env.Sandbox, `project-${projectId}`);
		const projectDir = `/runner/projects/${projectId}`;
		const userFilesDir = getUserFilesDir(projectId);

		// Ensure directories exist
		await sandbox.exec(`mkdir -p ${projectDir}`);
		await sandbox.exec(`mkdir -p ${userFilesDir}`);

		// Create a named pipe for input
		const inputFifo = getTerminalInputFifo(projectId);
		await sandbox.exec(`rm -f ${inputFifo}`);
		await sandbox.exec(`mkfifo ${inputFifo}`);

		// Start bash with proper terminal settings
		// Use a wrapper script that keeps the FIFO open and handles the PTY properly
		const cols = body.cols || 80;
		const rows = body.rows || 24;

		// Open FIFO for writing in background to prevent blocking, then start terminal
		// Using tail -f /dev/null keeps the writing end open
		// Send an initial newline to trigger the prompt
		const stream = await sandbox.execStream(
			`cd ${userFilesDir} && (tail -f /dev/null > ${inputFifo} &) && sleep 0.1 && (echo "" > ${inputFifo} &) && TERM=xterm-256color PS1='\\[\\033[01;32m\\]\\u@sandbox\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ ' script -qfc "stty rows ${rows} cols ${cols} && exec bash --norc -i" /dev/null < ${inputFifo}`
		);

		// Create a readable stream for the client
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		(async () => {
			try {
				for await (const event of parseSSEStream(stream)) {
					const sseEvent = event as SSEEvent;
					if (sseEvent.type === "stdout" && sseEvent.data) {
						// Forward raw terminal output
						await writer.write(encoder.encode(sseEvent.data));
					} else if (sseEvent.type === "stderr" && sseEvent.data) {
						// Also forward stderr
						await writer.write(encoder.encode(sseEvent.data));
					} else if (sseEvent.type === "error") {
						console.error("Terminal stream error:", sseEvent.error);
						break;
					} else if (sseEvent.type === "complete") {
						break;
					}
				}
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					console.error("Terminal stream error:", error);
				}
			} finally {
				// Cleanup
				await sandbox
					.exec(`pkill -P $$ tail 2>/dev/null || true`)
					.catch(() => {});
				await sandbox.exec(`rm -f ${inputFifo}`).catch(() => {});
				await writer.close();
			}
		})();

		return new Response(readable, {
			headers: {
				"Content-Type": "application/octet-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Terminal failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({
				error: "Failed to start terminal",
				details: errorMessage,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

async function handleTerminalInput(
	projectId: string,
	request: Request,
	env: Env
): Promise<Response> {
	try {
		const body = (await request.json()) as TerminalInputRequestBody;

		// Get a fresh sandbox instance for this request (can't reuse across requests in Workers)
		const sandbox = getSandbox(env.Sandbox, `project-${projectId}`);
		const inputFifo = getTerminalInputFifo(projectId);

		// Write input to the FIFO using a non-blocking approach
		// Use printf with octal escaping to handle special characters safely
		const octalInput = Array.from(body.input)
			.map((c) => "\\" + c.charCodeAt(0).toString(8).padStart(3, "0"))
			.join("");

		// Use printf to write to FIFO (this won't block since tail is keeping it open)
		await sandbox.exec(`printf "${octalInput}" >> ${inputFifo}`, {
			timeout: 5000,
		});

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Terminal input failed:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(
			JSON.stringify({
				error: "Failed to send input",
				details: errorMessage,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}
