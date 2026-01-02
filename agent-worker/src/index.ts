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
	DATA_BUCKET: R2Bucket;
	AWS_ACCESS_KEY_ID: string;
	AWS_SECRET_ACCESS_KEY: string;
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
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
		const syncMatch = path.match(/^\/v1\/projects\/([^/]+)\/sync$/);

		const validateProjectId = (id: string): boolean =>
			/^[a-zA-Z0-9_-]+$/.test(id);

		const projectId = ensureMatch?.[1] || 
			chatMatch?.[1] || 
			filesListMatch?.[1] || 
			filesWriteMatch?.[1] || 
			filesMkdirMatch?.[1] || 
			filesDeleteMatch?.[1] || 
			filesMoveMatch?.[1] || 
			filesDownloadMatch?.[1] || 
			filesEventsMatch?.[1] || 
			terminalMatch?.[1] || 
			terminalInputMatch?.[1] ||
			syncMatch?.[1];

		if (!projectId) {
			return new Response(JSON.stringify({ error: "Invalid projectId" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (!validateProjectId(projectId)) {
			return new Response(JSON.stringify({ error: "Invalid projectId format" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const sandboxId = `project-${projectId}`;
		// Use a slightly longer timeout for chat requests as they might involve startup
		const sandbox = getSandbox(env.Sandbox, sandboxId, { sleepAfter: '5m' });

		if (request.method === "POST" && ensureMatch) {
			return handleEnsure(ensureMatch[1], request, env, sandbox, ctx);
		}

		if (request.method === "POST" && chatMatch) {
			return handleChat(chatMatch[1], request, env, sandbox, ctx);
		}

		if (request.method === "GET" && filesListMatch) {
			return handleFilesList(filesListMatch[1], request, env, sandbox);
		}

		if (request.method === "POST" && filesWriteMatch) {
			return handleFilesWrite(filesWriteMatch[1], request, env, sandbox);
		}

		if (request.method === "POST" && filesMkdirMatch) {
			return handleFilesMkdir(filesMkdirMatch[1], request, env, sandbox);
		}

		if (request.method === "POST" && filesDeleteMatch) {
			return handleFilesDelete(filesDeleteMatch[1], request, env, sandbox);
		}

		if (request.method === "POST" && filesMoveMatch) {
			return handleFilesMove(filesMoveMatch[1], request, env, sandbox);
		}

		if (request.method === "GET" && filesDownloadMatch) {
			return handleFilesDownload(filesDownloadMatch[1], url, env, sandbox);
		}

		if (request.method === "GET" && filesEventsMatch) {
			return handleFilesEvents(filesEventsMatch[1], request, env, sandbox);
		}

		if (request.method === "POST" && terminalMatch) {
			return handleTerminal(terminalMatch[1], request, env, sandbox);
		}

		if (request.method === "POST" && terminalInputMatch) {
			return handleTerminalInput(terminalInputMatch[1], request, env, sandbox);
		}

		if (request.method === "POST" && syncMatch) {
			return handleSync(syncMatch[1], request, env, sandbox);
		}

		return new Response(JSON.stringify({ error: "Not Found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	},
};

// Helper: Mount R2 bucket (idempotent - ignores "already mounted" errors)
async function mountR2Bucket(sandbox: SandboxInstance, env: Env): Promise<void> {
	const endpoint = "https://573d1b2ea922ae79ad5277bfa9df4aa7.r2.cloudflarestorage.com";
	const bucketName = "studio-bucket";
	const mountPath = "/storage";

	try {
		await sandbox.mountBucket(bucketName, mountPath, {
			endpoint,
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID,
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY
			}
		});
	} catch (e) {
		const msg = String(e);
		// Silently ignore "already mounted" - that's expected
		if (!msg.includes("already in use") && !msg.includes("MOUNT_EXISTS")) {
			throw e;
		}
	}
}

async function isDevServerHealthy(sandbox: SandboxInstance): Promise<boolean> {
	const check = await sandbox.exec(`curl -s -o /dev/null -w '%{http_code}' http://localhost:${PREVIEW_PORT}`);
	return check.stdout.trim() === '200';
}

async function startDevServer(sandbox: SandboxInstance, appDir: string, projectId: string): Promise<void> {
	// Kill any existing processes on the port
	await sandbox.exec(`pkill -f "next-server" || true`);
	await sandbox.exec(`pkill -f "next dev" || true`);
	await sandbox.exec(`fuser -k -9 ${PREVIEW_PORT}/tcp 2>/dev/null || true`);

	// Start server in background
	await sandbox.exec(`cd ${appDir} && PORT=${PREVIEW_PORT} npm run dev -- --turbo --port ${PREVIEW_PORT} > /tmp/nextjs.log 2>&1 &`);

	// Wait for health check (up to 30s)
	for (let i = 0; i < 30; i++) {
		await sandbox.exec("sleep 1");
		if (await isDevServerHealthy(sandbox)) {
			console.log(`[${projectId}] Dev server started`);
			return;
		}
	}

	const logContent = await sandbox.exec(`cat /tmp/nextjs.log`);
	console.error(`[${projectId}] Server startup failed. Logs:\n${logContent.stdout}`);
	throw new Error("Server startup failed after 30s");
}

async function getPreviewUrl(sandbox: SandboxInstance): Promise<string | undefined> {
	try {
		const ports = await sandbox.getExposedPorts(CUSTOM_DOMAIN);
		const existing = ports.find((p) => p.port === PREVIEW_PORT);
		if (existing) return existing.url;
		return (await sandbox.exposePort(PREVIEW_PORT, { hostname: CUSTOM_DOMAIN })).url;
	} catch {
		return undefined;
	}
}

async function handleEnsure(
	projectId: string,
	request: Request,
	env: Env,
	sandbox: SandboxInstance,
	ctx: ExecutionContext
): Promise<Response> {
	try {
		const sandboxId = `project-${projectId}`;
		const appDir = getAppDir(projectId);
		const userFilesDir = getUserFilesDir(projectId);
		const storageDir = getStorageProjectDir(projectId);

		// Step 1: Mount R2 bucket
		console.log(`[${projectId}] Step 1: Mounting R2 bucket...`);
		await mountR2Bucket(sandbox, env);

		// Step 2: Check container state
		console.log(`[${projectId}] Step 2: Checking container state...`);
		const storageCheck = await sandbox.exec(`test -d ${storageDir}`);
		const hasStorage = storageCheck.exitCode === 0;

		const appCheck = await sandbox.exec(`test -f ${appDir}/package.json`);
		const isWarm = appCheck.exitCode === 0;

		// Step 3: Setup workspace (only if cold)
		if (!isWarm) {
			console.log(`[${projectId}] Step 3: Cold container - setting up workspace...`);
			await sandbox.exec(`mkdir -p ${userFilesDir} ${appDir}`);

			if (hasStorage) {
				// Existing project: restore from storage (copies template + extracts tarball)
				console.log(`[${projectId}]   - Restoring from storage...`);
				const restored = await syncFromStorage(sandbox, projectId);
				
				// Safety fallback: if restore failed or node_modules missing, copy from template
				if (!restored) {
					console.log(`[${projectId}]   - Restore failed, copying template...`);
					await sandbox.exec(`cp -r /runner/survey-app/. ${appDir}/`);
				}
			} else {
				// New project: copy template and init storage
				console.log(`[${projectId}]   - Creating from template...`);
				await sandbox.exec(`cp -r /runner/survey-app/. ${appDir}/`);
				
				console.log(`[${projectId}]   - Initializing storage...`);
				await syncToStorage(sandbox, projectId);
			}

			// Symlink user_files
			await sandbox.exec(`ln -sfn ${userFilesDir} ${appDir}/user_files`);
		} else {
			console.log(`[${projectId}] Step 3: Container warm - skipping workspace setup`);
			// Ensure storage initialized for warm projects without it
			if (!hasStorage) {
				console.log(`[${projectId}]   - Initializing storage for warm project...`);
				await syncToStorage(sandbox, projectId);
			}
		}

		// Step 4: Start dev server
		console.log(`[${projectId}] Step 4: Ensuring dev server...`);
		if (!await isDevServerHealthy(sandbox)) {
			await startDevServer(sandbox, appDir, projectId);
		} else {
			console.log(`[${projectId}]   - Already running`);
		}

		// Step 5: Start OpenCode server
		console.log(`[${projectId}] Step 5: Ensuring OpenCode server...`);
		await ensureOpencodeServer(sandbox, appDir, env.ANTHROPIC_API_KEY);

		// Step 6: Get preview URL
		console.log(`[${projectId}] Step 6: Getting preview URL...`);
		const previewUrl = await getPreviewUrl(sandbox);

		console.log(`[${projectId}] Ensure complete`);
		return new Response(
			JSON.stringify({ status: "ready", sandboxId, previewUrl }),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error(`[${projectId}] Ensure failed:`, error);
		return new Response(
			JSON.stringify({ error: "Failed to ensure sandbox", details: String(error) }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}

// ============================================================================
// Sync Handler (Persist workspace to R2 storage)
// ============================================================================

async function handleSync(
	projectId: string,
	request: Request,
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		console.log(`[${projectId}] Sync request received`);
		
		// Sync workspace to storage
		await syncToStorage(sandbox, projectId);
		
		return new Response(
			JSON.stringify({ status: "synced", projectId }),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error("Sync failed:", error);
		return new Response(
			JSON.stringify({ error: "Failed to sync", details: String(error) }),
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
	env: Env,
	sandbox: SandboxInstance,
	ctx: ExecutionContext
): Promise<Response> {
	try {
		const body = (await request.json()) as ChatRequestBody;
		if (!body.message) {
			return new Response(JSON.stringify({ error: "Message required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// sandbox passed from caller
		const appDir = getAppDir(projectId);

		// OpenCode server is started in handleEnsure, but check just in case
		// (container might have restarted between ensure and chat)
		await ensureOpencodeServer(sandbox, appDir, env.ANTHROPIC_API_KEY);

		// Helper to find existing session from OpenCode API
		// This persists across Worker isolates since it queries the container directly
		const findExistingSession = async (): Promise<string | null> => {
			try {
				const listResult = await sandbox.exec(
					`curl -s "http://127.0.0.1:${OPENCODE_PORT}/session"`
				);
				
				if (listResult.exitCode !== 0 || !listResult.stdout) {
					return null;
				}
				
				// OpenCode returns Session[] - find one matching our project directory
				const sessions = JSON.parse(listResult.stdout);
				
				// Handle both array and object formats
				const sessionList = Array.isArray(sessions) 
					? sessions 
					: Object.entries(sessions).map(([id, data]) => ({ id, ...(data as object) }));
				
				for (const session of sessionList) {
					const sessionPath = session.path || session.directory || session.cwd || '';
					// Match by exact path or by project ID in path
					if (sessionPath === appDir || 
						sessionPath.includes(`/projects/${projectId}/`) ||
						sessionPath.endsWith(`/${projectId}/working_directory/app`)) {
						const id = session.id || session.ID || session.sessionId;
						if (id) {
							console.log(`Found existing OpenCode session: ${id} for project ${projectId}`);
							return id;
						}
					}
				}
				return null;
			} catch (e) {
				console.error("Error finding existing session:", e);
				return null;
			}
		};

		// Helper to delete a session from OpenCode
		const deleteSession = async (sessionIdToDelete: string): Promise<void> => {
			try {
				console.log(`[${projectId}] Deleting corrupted session: ${sessionIdToDelete}`);
				await sandbox.exec(
					`curl -s -X DELETE "http://127.0.0.1:${OPENCODE_PORT}/session/${sessionIdToDelete}"`
				);
				opencodeSessions.delete(projectId);
			} catch (e) {
				console.error(`[${projectId}] Failed to delete session:`, e);
			}
		};

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

		// Get session: first check in-memory cache, then query OpenCode, finally create new
		let sessionId: string | undefined = opencodeSessions.get(projectId);
		let isNewSession = false; // Track if we just created this session

		if (!sessionId) {
			// Worker memory doesn't persist across isolates, so query OpenCode directly
			const existingSession = await findExistingSession();
			if (existingSession) {
				sessionId = existingSession;
				// Cache it for subsequent requests in this isolate
				opencodeSessions.set(projectId, sessionId);
			} else {
				// No existing session found, create new one
				sessionId = await createNewSession();
				isNewSession = true;
			}
		}

		// Stream response using SSE for real-time updates
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		(async () => {
			// Keepalive interval - declared outside try so it can be cleared in catch/finally
			let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
			
			try {
				// Check provider readiness before sending message
				// This also serves as a warmup delay for the Anthropic provider connection
				const providerCheck = await sandbox.exec(`curl -s "http://127.0.0.1:${OPENCODE_PORT}/provider"`);
				try {
					const providers = JSON.parse(providerCheck.stdout || '{}');
					const connected = providers.connected || [];
					if (!connected.includes('anthropic')) {
						console.log(`[${projectId}] Anthropic provider not connected yet, waiting...`);
						// Wait a bit for provider to initialize
						await new Promise(resolve => setTimeout(resolve, 1000));
						// Check again
						const retryCheck = await sandbox.exec(`curl -s "http://127.0.0.1:${OPENCODE_PORT}/provider"`);
						const retryProviders = JSON.parse(retryCheck.stdout || '{}');
						if (!retryProviders.connected?.includes('anthropic')) {
							console.error(`[${projectId}] Anthropic provider still not connected:`, retryProviders.connected);
						}
					}
				} catch (e) {
					console.log(`[${projectId}] Provider check parse error (continuing anyway):`, e);
				}

				// Connect to OpenCode event stream
				const eventStream = await sandbox.execStream(
					`curl -sN "http://127.0.0.1:${OPENCODE_PORT}/event"`
				);

				// Track state
				let messageComplete = false;
				const partTextMap = new Map<string, string>();
				
				// Keepalive: send ping every 15 seconds to prevent connection timeout
				keepaliveInterval = setInterval(async () => {
					if (!messageComplete) {
						try {
							await writer.write(encoder.encode(`: keepalive\n\n`));
						} catch {
							// Writer closed, stop keepalive
							if (keepaliveInterval) clearInterval(keepaliveInterval);
						}
					}
				}, 15000);

				// Send the message (async)
				let promptText = body.message;
				
				// If this is a new session and we have history, prepend it for context restoration
				// Limit to last 10 messages AND truncate long messages to avoid token overflow
				const MAX_HISTORY_MESSAGES = 10;
				const MAX_MESSAGE_LENGTH = 500; // Truncate long messages
				if (isNewSession && body.history && body.history.length > 0) {
					const recentHistory = body.history.slice(-MAX_HISTORY_MESSAGES);
					console.log(`Restoring context for new session ${sessionId} with ${recentHistory.length}/${body.history.length} messages`);
					const transcript = recentHistory
						.map(m => {
							let content = m.content;
							if (content.length > MAX_MESSAGE_LENGTH) {
								content = content.substring(0, MAX_MESSAGE_LENGTH) + "... [truncated]";
							}
							return `[${m.role === 'user' ? 'User' : 'Assistant'}]: ${content}`;
						})
						.join("\n\n");
					
					promptText = `Here is the recent conversation history for context:\n\n${transcript}\n\n[User]: ${body.message}`;
				}

				const promptBody = JSON.stringify({
					model: {
						providerID: "anthropic",
						modelID: "claude-sonnet-4-5",
					},
					parts: [{ type: "text", text: promptText }],
				}).replace(/'/g, "'\\''");

				// Helper to check if error is a session corruption issue (403/forbidden)
				const isSessionCorrupted = (parsed: any): boolean => {
					// Check for various error patterns that indicate session corruption
					if (parsed.name === "SessionNotFoundError") return true;
					if (parsed.error?.includes("session")) return true;
					if (parsed.name === "APIError" && parsed.statusCode === 403) return true;
					if (parsed.error?.type === "forbidden") return true;
					if (parsed.error?.message?.includes("Request not allowed")) return true;
					// Check nested error structure from OpenCode
					if (parsed.info?.error?.name === "APIError") return true;
					return false;
				};

				// Helper to execute message with retry on session error
				const executeMessage = async (currentSessionId: string, retryCount = 0): Promise<any> => {
					// Use verbose curl to capture connection errors
					const result = await sandbox.exec(
						`curl -v -s -X POST "http://127.0.0.1:${OPENCODE_PORT}/session/${currentSessionId}/message?directory=${encodeURIComponent(appDir)}" -H "Content-Type: application/json" -d '${promptBody}'`
					);
					
					// Log execution result for debugging
					if (result.exitCode !== 0) {
						console.error(`Opencode request failed (exit ${result.exitCode}):`, result.stderr);
					} else {
						console.log(`[${projectId}] Opencode response:`, result.stdout.substring(0, 200));
					}

					// Parse result to check for session errors immediately
					if (result.stdout) {
						try {
							const parsed = JSON.parse(result.stdout);
							
							// Check for corrupted session (403, forbidden, session not found)
							if (isSessionCorrupted(parsed) && retryCount < 2) {
								console.log(`[${projectId}] Session ${currentSessionId} corrupted (attempt ${retryCount + 1}), deleting and recreating...`);
								
								// Delete the corrupted session
								await deleteSession(currentSessionId);
								
								// Create fresh session
								const newSessionId = await createNewSession();
								sessionId = newSessionId;
								
								// Reconstruct prompt with history for the new session
								let retryPromptText = body.message;
								if (body.history && body.history.length > 0) {
									const recentHistory = body.history.slice(-MAX_HISTORY_MESSAGES);
									const transcript = recentHistory
										.map(m => {
											let content = m.content;
											if (content.length > MAX_MESSAGE_LENGTH) {
												content = content.substring(0, MAX_MESSAGE_LENGTH) + "... [truncated]";
											}
											return `[${m.role === 'user' ? 'User' : 'Assistant'}]: ${content}`;
										})
										.join("\n\n");
									retryPromptText = `Here is the recent conversation history for context:\n\n${transcript}\n\n[User]: ${body.message}`;
								}
								
								const retryPromptBody = JSON.stringify({
									model: {
										providerID: "anthropic",
										modelID: "claude-sonnet-4-5",
									},
									parts: [{ type: "text", text: retryPromptText }],
								}).replace(/'/g, "'\\''");

								// Retry with new session (recursive with incremented retry count)
								const retryResult = await sandbox.exec(
									`curl -v -s -X POST "http://127.0.0.1:${OPENCODE_PORT}/session/${newSessionId}/message?directory=${encodeURIComponent(appDir)}" -H "Content-Type: application/json" -d '${retryPromptBody}'`
								);
								
								// Check if retry also failed with corruption
								if (retryResult.stdout) {
									try {
										const retryParsed = JSON.parse(retryResult.stdout);
										if (isSessionCorrupted(retryParsed)) {
											console.error(`[${projectId}] Session still corrupted after retry, may need manual intervention`);
										}
									} catch {}
								}
								
								return retryResult;
							}
						} catch (e) {
							// Ignore parse errors here, let main loop handle it
						}
					}
					return result;
				};

				const messagePromise = executeMessage(sessionId);

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
											// The prompt might contain the history prefix, but Opencode output shouldn't.
											// However, if Opencode echoes the prompt, we need to be careful.
											// Typically Opencode streams only the *new* content.
											// But if we modified the prompt, we should ensure we don't accidentally leak it.
											// We check both the full prompt text (with history) and the original user message.
											
											if (delta.startsWith(promptText)) {
												// Strips full history transcript if echoed
												delta = delta.slice(promptText.length).trimStart();
											} else if (delta.startsWith(body.message.trim())) {
												// Fallback: Strips just the user message if echoed
												delta = delta.slice(body.message.trim().length).trimStart();
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
									if (data.name === "SessionNotFoundError" || data.message?.includes("session")) {
										// This error came via stream, trigger retry logic if needed
										// But since we are streaming, we might just want to inform user or autorecover
										// For now, let's treat it as a hard error that the client will retry
										opencodeSessions.delete(projectId);
									}
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
						// We handled retry in executeMessage, but check one last time
						if (result.name === "SessionNotFoundError" || result.error?.includes("session")) {
							opencodeSessions.delete(projectId);
							throw new Error("Session expired, please retry");
						}

						// Check for API errors (rate limits, auth errors, etc.)
						if (result.error || result.info?.error) {
							const errorInfo = result.error || result.info?.error;
							const errorName = errorInfo?.name || errorInfo?.type || "APIError";
							const errorMessage = errorInfo?.message || errorInfo?.data || JSON.stringify(errorInfo);
							console.error(`[${projectId}] OpenCode API error:`, errorName, errorMessage);
							
							// Send error to client if no text was streamed
							if (partTextMap.size === 0) {
								throw new Error(`${errorName}: ${errorMessage}`);
							}
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
						
						// If still no text and no error, something went wrong
						if (partTextMap.size === 0 && !result.parts?.length) {
							console.warn(`[${projectId}] OpenCode returned empty response:`, messageResult.stdout.substring(0, 300));
						}
					} catch (e) {
						// Re-throw non-parse errors
						if (!(e instanceof SyntaxError)) throw e;
						console.warn(`[${projectId}] Failed to parse OpenCode response:`, messageResult.stdout.substring(0, 200));
					}
				}

				if (keepaliveInterval) clearInterval(keepaliveInterval);
				await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "session_id", sessionId })}\n\n`));
				await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
			} catch (error) {
				console.error("Chat error:", error);
				if (keepaliveInterval) clearInterval(keepaliveInterval);
				if (String(error).toLowerCase().includes("session")) {
					opencodeSessions.delete(projectId);
				}
				await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`));
			} finally {
				if (keepaliveInterval) clearInterval(keepaliveInterval);
				await writer.close();
				
				// Sync to storage when chat session ends
				ctx.waitUntil(
					(async () => {
						try {
							await syncToStorage(sandbox, projectId);
						} catch (e) {
							console.error(`[${projectId}] Post-chat sync failed:`, e);
						}
					})()
				);
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

// Storage paths (R2 mounted - persistent)
function getStorageProjectDir(projectId: string): string {
	return `/storage/projects/${projectId}`;
}

function getUserFilesDir(projectId: string): string {
	return `/workspace/projects/${projectId}/working_directory/user_files`;
}

function getAppDir(projectId: string): string {
	return `/workspace/projects/${projectId}/working_directory/app`;
}

function getWorkspaceProjectDir(projectId: string): string {
	return `/workspace/projects/${projectId}`;
}

/**
 * Sync files from R2 storage to local workspace (on project open)
 */
async function syncFromStorage(sandbox: SandboxInstance, projectId: string): Promise<boolean> {
	const storageDir = getStorageProjectDir(projectId);
	const workspaceDir = getWorkspaceProjectDir(projectId);
	const tarballPath = `${storageDir}/workspace.tar.gz`;
	
	// Check if tarball exists
	const checkTarball = await sandbox.exec(`test -f ${tarballPath}`);
	if (checkTarball.exitCode !== 0) {
		console.log(`[${projectId}] No tarball found, starting fresh`);
		return false;
	}
	
	console.log(`[${projectId}] Restoring from tarball...`);
	await sandbox.exec(`mkdir -p ${workspaceDir}`);
	
	// Copy template as base, then overlay user changes from tarball
	await sandbox.exec(`cp -r /runner/survey-app/. ${workspaceDir}/`);
	
	const extractResult = await sandbox.exec(
		`tar -xzf ${tarballPath} -C ${workspaceDir}`
	);
	if (extractResult.exitCode !== 0) {
		console.error(`[${projectId}] Tarball extract failed:`, extractResult.stderr);
		return false;
	}
	
	console.log(`[${projectId}] Restore from tarball complete`);
	return true;
}

/**
 * Sync files from local workspace to R2 storage (for persistence)
 * Only stores delta from template to minimize storage and transfer time
 */
async function syncToStorage(sandbox: SandboxInstance, projectId: string): Promise<void> {
	const storageDir = getStorageProjectDir(projectId);
	const workspaceDir = getWorkspaceProjectDir(projectId);
	const tarballPath = `${storageDir}/workspace.tar.gz`;
	const tempTarball = `/tmp/workspace-${projectId}.tar.gz`;
	
	// Check if workspace has files
	const checkWorkspace = await sandbox.exec(`test -d ${workspaceDir}`);
	if (checkWorkspace.exitCode !== 0) {
		console.log(`[${projectId}] No workspace files to sync`);
		return;
	}
	
	console.log(`[${projectId}] Creating workspace tarball...`);
	
	// Exclude node_modules, .git, .next (these are either baked in template or generated)
	const tarResult = await sandbox.exec(
		`cd ${workspaceDir} && tar -czf ${tempTarball} ` +
		`--exclude='node_modules' --exclude='.git' --exclude='.next' ` +
		`--exclude='*.log' --exclude='.turbo' ` +
		`.`
	);
	if (tarResult.exitCode !== 0) {
		console.error(`[${projectId}] Tarball creation failed:`, tarResult.stderr);
		throw new Error(`Tarball creation failed: ${tarResult.stderr}`);
	}
	
	// Get tarball size for logging
	const sizeResult = await sandbox.exec(`stat -c%s ${tempTarball} 2>/dev/null || stat -f%z ${tempTarball}`);
	const sizeKB = Math.round(parseInt(sizeResult.stdout.trim()) / 1024);
	console.log(`[${projectId}] Tarball size: ${sizeKB}KB`);
	
	await sandbox.exec(`mkdir -p ${storageDir}`);
	const mvResult = await sandbox.exec(`mv ${tempTarball} ${tarballPath}`);
	if (mvResult.exitCode !== 0) {
		console.error(`[${projectId}] Tarball move to storage failed:`, mvResult.stderr);
		throw new Error(`Sync failed: ${mvResult.stderr}`);
	}
	
	console.log(`[${projectId}] Sync to storage complete (${sizeKB}KB tarball)`);
}

async function handleFilesList(
	projectId: string,
	request: Request,
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const body = (await request.json()) as FileWriteRequestBody;
		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const body = (await request.json()) as MkdirRequestBody;
		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const body = (await request.json()) as DeleteRequestBody;
		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const body = (await request.json()) as MoveRequestBody;
		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
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

		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const body = (await request.json()) as TerminalRequestBody;
		// sandbox passed from caller
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
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const body = (await request.json()) as TerminalInputRequestBody;

		// sandbox passed from caller
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
