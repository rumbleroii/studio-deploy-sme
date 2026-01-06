import {
	getSandbox,
	parseSSEStream,
	Sandbox,
	proxyToSandbox,
} from "@cloudflare/sandbox";
export { Sandbox };

// OpenCode server runs on port 4096
const OPENCODE_PORT = 4096;

interface Env {
	Sandbox: DurableObjectNamespace<Sandbox>;
	AGENT_WORKER_SHARED_SECRET: string;
	ANTHROPIC_API_KEY: string;
	DATA_BUCKET: R2Bucket;
	AWS_ACCESS_KEY_ID: string;
	AWS_SECRET_ACCESS_KEY: string;
	R2_ENDPOINT: string;
	R2_BUCKET_NAME: string;
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
		const buildMatch = path.match(/^\/v1\/projects\/([^/]+)\/build$/);
		const deployVercelMatch = path.match(/^\/v1\/projects\/([^/]+)\/deploy-vercel$/);
		const pingMatch = path.match(/^\/v1\/projects\/([^/]+)\/ping$/);
		const resetMatch = path.match(/^\/v1\/projects\/([^/]+)\/reset$/);
		const healthMatch = path.match(/^\/v1\/projects\/([^/]+)\/health$/);

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
			syncMatch?.[1] ||
			buildMatch?.[1] ||
			deployVercelMatch?.[1] ||
			pingMatch?.[1] ||
			resetMatch?.[1] ||
			healthMatch?.[1];

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
		// Sandbox sleeps after 30 min of inactivity; frontend heartbeat pings every 1 min to keep it awake
		const sandbox = getSandbox(env.Sandbox, sandboxId, { sleepAfter: '30m' });

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

		if (request.method === "POST" && buildMatch) {
			return handleBuild(buildMatch[1], env, sandbox);
		}

		if (request.method === "POST" && deployVercelMatch) {
			return handleDeployVercel(deployVercelMatch[1], env, sandbox);
		}

		if (request.method === "POST" && pingMatch) {
			return handlePing(pingMatch[1], sandbox);
		}

		if (request.method === "POST" && resetMatch) {
			return handleReset(resetMatch[1], sandbox, env);
		}

		if (request.method === "GET" && healthMatch) {
			return handleHealth(healthMatch[1], sandbox);
		}

		return new Response(JSON.stringify({ error: "Not Found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	},
};

// ============================================================================
// R2 Mount Helpers (with locking and retry for concurrent access)
// ============================================================================

const MOUNT_LOCK_PATH = "/tmp/.r2_mount_lock";
const MOUNT_LOCK_TIMEOUT_MS = 30000; // 30 second lock timeout
const MOUNT_RETRY_CONFIG = {
	maxAttempts: 3,
	initialDelayMs: 200,
	maxDelayMs: 2000,
	backoffMultiplier: 2,
};

/**
 * Acquire a file-based lock for mount operations.
 * Returns true if lock acquired, false if lock is held by another process.
 */
async function acquireMountLock(sandbox: SandboxInstance): Promise<boolean> {
	const now = Date.now();
	
	// Check if lock exists and is still valid
	const checkResult = await sandbox.exec(`cat ${MOUNT_LOCK_PATH} 2>/dev/null || echo ""`);
	const lockContent = checkResult.stdout.trim();
	
	if (lockContent) {
		const lockTime = parseInt(lockContent, 10);
		if (!isNaN(lockTime) && (now - lockTime) < MOUNT_LOCK_TIMEOUT_MS) {
			// Lock is still valid and held by another process
			return false;
		}
		// Lock is stale, we can take it
	}
	
	// Acquire lock atomically using a temp file and mv (atomic on most filesystems)
	const tempLockPath = `/tmp/.r2_mount_lock_${now}_${Math.random().toString(36).slice(2)}`;
	await sandbox.exec(`echo "${now}" > ${tempLockPath}`);
	
	// Try to atomically move to lock path (fails if another process got there first)
	const mvResult = await sandbox.exec(`mv -n ${tempLockPath} ${MOUNT_LOCK_PATH} 2>/dev/null && echo "OK" || echo "FAILED"`);
	
	// Clean up temp file if it still exists
	await sandbox.exec(`rm -f ${tempLockPath}`);
	
	if (mvResult.stdout.trim() === "OK") {
		return true;
	}
	
	// Check if we actually own the lock (our timestamp is in it)
	const verifyResult = await sandbox.exec(`cat ${MOUNT_LOCK_PATH} 2>/dev/null || echo ""`);
	return verifyResult.stdout.trim() === String(now);
}

/**
 * Release the mount lock
 */
async function releaseMountLock(sandbox: SandboxInstance): Promise<void> {
	await sandbox.exec(`rm -f ${MOUNT_LOCK_PATH}`);
}

/**
 * Check if R2 is already mounted and accessible
 */
async function isMountHealthy(sandbox: SandboxInstance, mountPath: string): Promise<boolean> {
	try {
		// First just try to access the mount - this is the most reliable check
		const accessCheck = await sandbox.exec(`ls ${mountPath} >/dev/null 2>&1 && echo "OK" || echo "FAILED"`, { timeout: 5000 });
		if (accessCheck.stdout.trim() === "OK") {
			return true;
		}
		
		// Fallback: check if it's a mount point
		const checkResult = await sandbox.exec(`mountpoint -q ${mountPath} 2>/dev/null && echo "MOUNTED" || echo "NOT_MOUNTED"`);
		if (checkResult.stdout.trim() === "MOUNTED") {
			return false;
		}
		
		return false;
	} catch {
		return false;
	}
}

/**
 * Aggressively clean mount point before mounting
 */
async function cleanMountPoint(sandbox: SandboxInstance, mountPath: string): Promise<void> {
	// First try to unmount if something is mounted
	await sandbox.exec(`umount -f ${mountPath} 2>/dev/null || true`);
	await sandbox.exec(`fusermount -u ${mountPath} 2>/dev/null || true`);
	
	// Remove the directory and recreate it
	await sandbox.exec(`rm -rf ${mountPath}`);
	await sandbox.exec(`mkdir -p ${mountPath}`);
}

/**
 * Check if an error indicates a mount conflict (nonempty, already in use, etc.)
 */
function isMountConflictError(error: unknown): boolean {
	const msg = String(error).toLowerCase();
	return (
		msg.includes("not empty") ||
		msg.includes("nonempty") ||
		msg.includes("already in use") ||
		msg.includes("mount_exists") ||
		msg.includes("busy") ||
		msg.includes("device or resource busy")
	);
}

/**
 * Check if mount is already successfully completed (idempotent success)
 */
function isAlreadyMountedError(error: unknown): boolean {
	const msg = String(error).toLowerCase();
	return (
		msg.includes("already in use") || 
		msg.includes("mount_exists") ||
		msg.includes("invalidmountconfigerror")
	);
}

// Helper: Check if error is a permanent infrastructure issue (no point retrying)
function isPermanentMountError(error: unknown): boolean {
	const msg = String(error).toLowerCase();
	// FUSE not available (local dev mode)
	if (msg.includes("fuse: device not found") || msg.includes("modprobe fuse")) {
		return true;
	}
	return false;
}

// Helper: Mount R2 bucket with locking and retry
async function mountR2Bucket(sandbox: SandboxInstance, env: Env): Promise<void> {
	const endpoint = env.R2_ENDPOINT;
	const bucketName = env.R2_BUCKET_NAME;
	const mountPath = "/storage";

	// Fast path: check if already mounted and healthy
	if (await isMountHealthy(sandbox, mountPath)) {
		return;
	}

	let lastError: unknown;
	let lockAcquired = false;

	for (let attempt = 0; attempt < MOUNT_RETRY_CONFIG.maxAttempts; attempt++) {
		try {
			// Backoff delay on retries
			if (attempt > 0) {
				const delay = Math.min(
					MOUNT_RETRY_CONFIG.initialDelayMs * Math.pow(MOUNT_RETRY_CONFIG.backoffMultiplier, attempt - 1),
					MOUNT_RETRY_CONFIG.maxDelayMs
				);
				await sleep(delay);
			}

			// Acquire lock (with timeout)
			const lockStartTime = Date.now();
			while (!lockAcquired && (Date.now() - lockStartTime) < 5000) {
				lockAcquired = await acquireMountLock(sandbox);
				if (!lockAcquired) {
					await sleep(100);
				}
			}

			if (!lockAcquired) {
				throw new Error("Failed to acquire mount lock within timeout");
			}

			// Double-check mount status after acquiring lock (another process may have mounted)
			if (await isMountHealthy(sandbox, mountPath)) {
				return;
			}

			// Clean mount point before attempting mount
			await cleanMountPoint(sandbox, mountPath);

			// Attempt the mount
			await sandbox.mountBucket(bucketName, mountPath, {
				endpoint,
				credentials: {
					accessKeyId: env.AWS_ACCESS_KEY_ID,
					secretAccessKey: env.AWS_SECRET_ACCESS_KEY
				}
			});

			// Verify mount succeeded
			if (await isMountHealthy(sandbox, mountPath)) {
				console.log(`R2 bucket mounted successfully (attempt ${attempt + 1})`);
				return;
			}

			throw new Error("Mount completed but health check failed");

		} catch (e) {
			lastError = e;
			const errorStr = String(e);

			// If already mounted, the SDK knows best - just verify we can access it
			if (isAlreadyMountedError(e)) {
				console.log(`Mount reports already in use, verifying accessibility...`);
				
				// Give it a moment for mount to stabilize
				await sleep(500);
				
				// Try to access the mount directly
				const accessCheck = await sandbox.exec(`ls ${mountPath} >/dev/null 2>&1 && echo "OK" || echo "FAILED"`, { timeout: 5000 });
				if (accessCheck.stdout.trim() === "OK") {
					console.log(`Mount is accessible, treating as success`);
					return;
				}
				
				// If still not accessible, the mount might be stale - try unmounting via SDK workaround
				console.log(`Mount claimed but not accessible, attempting recovery...`);
				
				// Try forceful cleanup
				await sandbox.exec(`fusermount -uz ${mountPath} 2>/dev/null || true`);
				await sandbox.exec(`umount -l ${mountPath} 2>/dev/null || true`);
				await sleep(500);
				
				// Retry the mount on next iteration
				continue;
			}

			// If mount conflict, clean and retry
			if (isMountConflictError(e)) {
				console.log(`Mount conflict error (attempt ${attempt + 1}): ${errorStr}, cleaning and retrying...`);
				await cleanMountPoint(sandbox, mountPath);
				continue;
			}

			// Check for permanent errors (e.g., FUSE not available in local dev)
			if (isPermanentMountError(e)) {
				console.warn(`Mount failed with permanent error (FUSE not available - likely local dev mode), skipping R2 mount`);
				if (lockAcquired) {
					await releaseMountLock(sandbox);
				}
				return; // Skip mount in dev mode
			}

			// Log other errors
			console.error(`Mount attempt ${attempt + 1} failed:`, errorStr);

		} finally {
			// Release lock if we acquired it
			if (lockAcquired) {
				await releaseMountLock(sandbox);
				lockAcquired = false;
			}
		}
	}

	// All retries exhausted
	throw new Error(`Failed to mount R2 bucket after ${MOUNT_RETRY_CONFIG.maxAttempts} attempts: ${lastError}`);
}

async function isDevServerHealthy(sandbox: SandboxInstance): Promise<boolean> {
	try {
		const check = await sandbox.exec(
			`curl -s -o /dev/null -w '%{http_code}' http://localhost:${PREVIEW_PORT}`,
			{ timeout: 3000 }
		);
		return check.stdout.trim() === '200';
	} catch {
		return false;
	}
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

async function getPreviewUrlCached(sandbox: SandboxInstance): Promise<string | undefined> {
	try {
		const ports = await sandbox.getExposedPorts(CUSTOM_DOMAIN);
		const existing = ports.find((p) => p.port === PREVIEW_PORT);
		return existing?.url;
	} catch {
		return undefined;
	}
}

async function isOpencodeHealthy(sandbox: SandboxInstance): Promise<boolean> {
	try {
		const checkResult = await sandbox.exec(
			`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${OPENCODE_PORT}/ 2>/dev/null || echo "000"`,
			{ timeout: 3000 }
		);
		return checkResult.stdout.trim() === '200';
	} catch {
		return false;
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

		// =====================================================================
		// FAST PATH: Check if container is warm with all services running
		// =====================================================================
		const appCheck = await sandbox.exec(`test -f ${appDir}/package.json`, { timeout: 3000 });
		const isWarm = appCheck.exitCode === 0;

		if (isWarm) {
			// Parallel health checks - much faster than sequential
			const [devServerHealthy, opencodeHealthy, cachedPreviewUrl] = await Promise.all([
				isDevServerHealthy(sandbox),
				isOpencodeHealthy(sandbox),
				getPreviewUrlCached(sandbox)
			]);

			// If everything is running, return immediately (fast path ~50-100ms)
			if (devServerHealthy && opencodeHealthy && cachedPreviewUrl) {
				console.log(`[${projectId}] Fast-path: all services running`);
				return new Response(
					JSON.stringify({ status: "ready", sandboxId, previewUrl: cachedPreviewUrl }),
					{ headers: { "Content-Type": "application/json" } }
				);
			}

			// Some services need starting - do minimal work in parallel
			console.log(`[${projectId}] Warm container - starting missing services (dev:${devServerHealthy}, opencode:${opencodeHealthy}, preview:${!!cachedPreviewUrl})`);
			
			const startPromises: Promise<void>[] = [];
			
			if (!devServerHealthy) {
				startPromises.push(startDevServer(sandbox, appDir, projectId));
			}
			if (!opencodeHealthy) {
				startPromises.push(ensureOpencodeServer(sandbox, appDir, env.ANTHROPIC_API_KEY));
			}

			// Start services in parallel
			await Promise.all(startPromises);

			// Get preview URL (expose if needed)
			const previewUrl = cachedPreviewUrl || await getPreviewUrl(sandbox);

			// Check if we need to init storage (rare case: warm container without R2 backup)
			ctx.waitUntil((async () => {
				const hasStorage = await checkProjectExistsInR2(env.DATA_BUCKET, projectId);
				if (!hasStorage) {
					console.log(`[${projectId}] Background: initializing storage for warm project`);
					await syncToStorage(sandbox, projectId);
				}
			})());

			console.log(`[${projectId}] Warm ensure complete`);
			return new Response(
				JSON.stringify({ status: "ready", sandboxId, previewUrl }),
				{ headers: { "Content-Type": "application/json" } }
			);
		}

		// =====================================================================
		// COLD PATH: Full initialization (container just started)
		// =====================================================================
		console.log(`[${projectId}] Cold container - full initialization...`);

		// Step 1: Mount R2 and check storage in parallel
		const [, hasStorage] = await Promise.all([
			mountR2Bucket(sandbox, env),
			checkProjectExistsInR2(env.DATA_BUCKET, projectId)
		]);
		console.log(`[${projectId}] R2 mounted, storage exists: ${hasStorage}`);

		// Step 2: Setup workspace
		await sandbox.exec(`mkdir -p ${userFilesDir} ${appDir}`);

		if (hasStorage) {
			// Existing project: restore from storage
			console.log(`[${projectId}] Restoring from storage...`);
			const restored = await syncFromStorage(sandbox, projectId);
			
			if (!restored) {
				console.log(`[${projectId}] Restore failed, copying template...`);
				await sandbox.exec(`cp -r /runner/survey-app/. ${appDir}/`);
			}
		} else {
			// New project: copy template
			console.log(`[${projectId}] Creating from template...`);
			await sandbox.exec(`cp -r /runner/survey-app/. ${appDir}/`);
			
			// Defer initial sync to background (don't block response)
			ctx.waitUntil(
				syncToStorage(sandbox, projectId).catch(e => 
					console.error(`[${projectId}] Background sync failed:`, e)
				)
			);
		}

		// Symlink user_files
		await sandbox.exec(`ln -sfn ${userFilesDir} ${appDir}/user_files`);

		// Step 3: Start services in parallel (biggest win for cold start)
		console.log(`[${projectId}] Starting services in parallel...`);
		const [previewUrl] = await Promise.all([
			getPreviewUrl(sandbox),
			startDevServer(sandbox, appDir, projectId),
			ensureOpencodeServer(sandbox, appDir, env.ANTHROPIC_API_KEY)
		]);

		console.log(`[${projectId}] Cold ensure complete`);
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
// Ping Handler (Lightweight keepalive to prevent sandbox hibernation)
// ============================================================================

async function handlePing(
	projectId: string,
	_sandbox: SandboxInstance // Not used - just receiving the request keeps DO alive
): Promise<Response> {
	// NOTE: We intentionally DON'T call sandbox.exec() here because:
	// 1. Just receiving a request to the Durable Object resets its hibernation timer
	// 2. sandbox.exec() would block if another operation (like chat) is in progress
	// 3. This makes pings instant and non-blocking
	console.log(`[${projectId}] Ping received (keepalive)`);
	
	return new Response(
		JSON.stringify({ status: "ok", projectId, timestamp: Date.now() }),
		{ headers: { "Content-Type": "application/json" } }
	);
}

// ============================================================================
// Reset Handler (Fix broken containers)
// ============================================================================

/**
 * Reset a broken container to a clean state.
 * This kills all processes, unmounts storage, deletes workspace,
 * and clears cached session state. Next ensure will restore from R2.
 */
async function handleReset(
	projectId: string,
	sandbox: SandboxInstance,
	env: Env
): Promise<Response> {
	console.log(`[${projectId}] Reset requested - cleaning up container...`);
	
	const results: string[] = [];
	
	try {
		// 1. Kill OpenCode server
		console.log(`[${projectId}] Killing OpenCode server...`);
		await sandbox.exec(`pkill -f "opencode" 2>/dev/null || true`, { timeout: 5000 });
		results.push("OpenCode killed");
		
		// 2. Kill dev server
		console.log(`[${projectId}] Killing dev server...`);
		await sandbox.exec(`pkill -f "next-server" 2>/dev/null || true`, { timeout: 5000 });
		await sandbox.exec(`pkill -f "next dev" 2>/dev/null || true`, { timeout: 5000 });
		await sandbox.exec(`fuser -k -9 3001/tcp 2>/dev/null || true`, { timeout: 5000 });
		results.push("Dev server killed");
		
		// 3. Unmount R2 storage
		console.log(`[${projectId}] Unmounting storage...`);
		await sandbox.exec(`fusermount -u /storage 2>/dev/null || true`, { timeout: 5000 });
		await sandbox.exec(`umount -f /storage 2>/dev/null || true`, { timeout: 5000 });
		results.push("Storage unmounted");
		
		// 4. Delete workspace (will be restored from R2 on next ensure)
		console.log(`[${projectId}] Deleting workspace...`);
		const workspaceDir = `/workspace/projects/${projectId}`;
		await sandbox.exec(`rm -rf ${workspaceDir}`, { timeout: 30000 });
		results.push("Workspace deleted");
		
		// 5. Clear cached OpenCode session
		opencodeSessions.delete(projectId);
		results.push("Session cache cleared");
		
		// 6. Kill any remaining processes for this project
		await sandbox.exec(`pkill -f "${projectId}" 2>/dev/null || true`, { timeout: 5000 });
		
		// 7. Verify R2 has backup (so we can restore)
		const hasBackup = await checkProjectExistsInR2(env.DATA_BUCKET, projectId);
		
		console.log(`[${projectId}] Reset complete. R2 backup exists: ${hasBackup}`);
		
		return new Response(
			JSON.stringify({
				status: "reset_complete",
				projectId,
				results,
				hasR2Backup: hasBackup,
				nextStep: "Call /ensure to restore from R2 or create fresh"
			}),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error(`[${projectId}] Reset failed:`, error);
		return new Response(
			JSON.stringify({
				status: "reset_failed",
				projectId,
				results,
				error: String(error)
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}

// ============================================================================
// Health Handler (Check container state)
// ============================================================================

/**
 * Check the health of a container - useful for diagnosing issues
 */
async function handleHealth(
	projectId: string,
	sandbox: SandboxInstance
): Promise<Response> {
	console.log(`[${projectId}] Health check requested`);
	
	const health: Record<string, unknown> = {
		projectId,
		timestamp: Date.now(),
		checks: {}
	};
	
	try {
		// Check if workspace exists
		const workspaceDir = `/workspace/projects/${projectId}`;
		const workspaceCheck = await sandbox.exec(`test -d ${workspaceDir} && echo "exists" || echo "missing"`, { timeout: 5000 });
		(health.checks as Record<string, unknown>).workspace = workspaceCheck.stdout.trim();
		
		// Check if app has package.json
		const appDir = `/workspace/projects/${projectId}/working_directory/app`;
		const appCheck = await sandbox.exec(`test -f ${appDir}/package.json && echo "exists" || echo "missing"`, { timeout: 5000 });
		(health.checks as Record<string, unknown>).app = appCheck.stdout.trim();
		
		// Check if storage is mounted
		const mountCheck = await sandbox.exec(`mountpoint -q /storage 2>/dev/null && echo "mounted" || echo "not_mounted"`, { timeout: 5000 });
		(health.checks as Record<string, unknown>).storage = mountCheck.stdout.trim();
		
		// Check if dev server is running
		const devServerCheck = await sandbox.exec(`curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 2>/dev/null || echo "000"`, { timeout: 5000 });
		const devServerStatus = devServerCheck.stdout.trim();
		(health.checks as Record<string, unknown>).devServer = devServerStatus === "200" ? "running" : `not_running (${devServerStatus})`;
		
		// Check if OpenCode is running
		const opencodeCheck = await sandbox.exec(`curl -s http://127.0.0.1:4096/ 2>/dev/null || echo "NOT_RUNNING"`, { timeout: 5000 });
		(health.checks as Record<string, unknown>).opencode = opencodeCheck.stdout.includes("NOT_RUNNING") ? "not_running" : "running";
		
		// Check cached session
		const cachedSession = opencodeSessions.get(projectId);
		(health.checks as Record<string, unknown>).cachedSession = cachedSession || "none";
		
		// Check OpenCode sessions from server
		const sessionsCheck = await sandbox.exec(`curl -s "http://127.0.0.1:4096/session" 2>/dev/null || echo "[]"`, { timeout: 5000 });
		try {
			const sessions = JSON.parse(sessionsCheck.stdout || '[]');
			const sessionList = Array.isArray(sessions) 
				? sessions 
				: Object.entries(sessions).map(([id, data]) => ({ id, ...(data as object) }));
			(health.checks as Record<string, unknown>).opencodeSessions = sessionList.length;
			(health.checks as Record<string, unknown>).sessionDetails = sessionList.map((s: Record<string, unknown>) => ({
				id: s.id || s.ID,
				path: s.path || s.directory,
				title: s.title
			}));
			
			// Get full session data for the first session (to understand structure)
			if (sessionList.length > 0) {
				const firstSessionId = sessionList[0].id || sessionList[0].ID;
				if (firstSessionId) {
					const fullSessionCheck = await sandbox.exec(
						`curl -s "http://127.0.0.1:4096/session/${firstSessionId}" 2>/dev/null || echo "{}"`, 
						{ timeout: 10000 }
					);
					try {
						const fullSession = JSON.parse(fullSessionCheck.stdout || '{}');
						// Show keys and sample of each to understand structure
						(health.checks as Record<string, unknown>).sessionStructure = {
							keys: Object.keys(fullSession),
							hasMessages: 'messages' in fullSession,
							messageCount: Array.isArray(fullSession.messages) ? fullSession.messages.length : 'N/A',
							// Show first message structure if available
							sampleMessage: Array.isArray(fullSession.messages) && fullSession.messages.length > 0 
								? { keys: Object.keys(fullSession.messages[0]), role: fullSession.messages[0].role }
								: null
						};
					} catch {
						(health.checks as Record<string, unknown>).sessionStructure = "error parsing full session";
					}
				}
			}
		} catch {
			(health.checks as Record<string, unknown>).opencodeSessions = "error parsing";
		}
		
		// Check OpenCode data directory structure (for debugging session persistence)
		const opencodeDataCheck = await sandbox.exec(`ls -la /root/.opencode/ 2>/dev/null || echo "NOT_FOUND"`, { timeout: 5000 });
		(health.checks as Record<string, unknown>).opencodeDataDir = opencodeDataCheck.stdout.trim();
		
		// Check if there's a .opencode in the working directory
		const projectOpencodeCheck = await sandbox.exec(`ls -la ${appDir}/.opencode/ 2>/dev/null || echo "NOT_FOUND"`, { timeout: 5000 });
		(health.checks as Record<string, unknown>).projectOpencodeDir = projectOpencodeCheck.stdout.trim();
		
		// Determine overall health
		const checks = health.checks as Record<string, unknown>;
		const isHealthy = 
			checks.workspace === "exists" &&
			checks.app === "exists" &&
			checks.devServer === "running" &&
			checks.opencode === "running";
		
		health.status = isHealthy ? "healthy" : "unhealthy";
		health.recommendation = isHealthy ? null : "Consider calling /reset to fix this container";
		
		return new Response(
			JSON.stringify(health),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error(`[${projectId}] Health check failed:`, error);
		return new Response(
			JSON.stringify({
				...health,
				status: "error",
				error: String(error)
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}

// ============================================================================
// Chat Handler (Direct OpenCode HTTP API)
// ============================================================================

// Store OpenCode session IDs per project
const opencodeSessions = new Map<string, string>();

// Retry configuration for RPC/stream operations
const RETRY_CONFIG = {
	maxAttempts: 3,
	initialDelayMs: 500,
	maxDelayMs: 5000,
	backoffMultiplier: 2,
};

// Keepalive interval (10s for more aggressive connection health checking)
const KEEPALIVE_INTERVAL_MS = 10000;

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
	const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
	return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Check if an error is retryable (RPC disconnects, stream errors, transient failures)
 */
function isRetryableError(error: unknown): boolean {
	const errorStr = String(error).toLowerCase();
	return (
		errorStr.includes('disconnected') ||
		errorStr.includes('rpc') ||
		errorStr.includes('stream') ||
		errorStr.includes('connection') ||
		errorStr.includes('timeout') ||
		errorStr.includes('network') ||
		errorStr.includes('econnreset') ||
		errorStr.includes('epipe') ||
		errorStr.includes('socket hang up')
	);
}

/**
 * Connect to OpenCode event stream with retry and exponential backoff
 */
async function connectEventStreamWithRetry(
	sandbox: SandboxInstance,
	projectId: string
): Promise<AsyncIterable<SSEEvent>> {
	let lastError: unknown;
	
	for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
		try {
			if (attempt > 0) {
				const delay = getRetryDelay(attempt - 1);
				console.log(`[${projectId}] Retrying event stream connection (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}) after ${delay}ms`);
				await sleep(delay);
			}
			
			const stream = await sandbox.execStream(
				`curl -sN "http://127.0.0.1:${OPENCODE_PORT}/event"`
			);
			
			console.log(`[${projectId}] Event stream connected (attempt ${attempt + 1})`);
			return parseSSEStream(stream) as AsyncIterable<SSEEvent>;
		} catch (error) {
			lastError = error;
			console.error(`[${projectId}] Event stream connection failed (attempt ${attempt + 1}):`, error);
			
			if (!isRetryableError(error) && attempt === 0) {
				// Non-retryable error on first attempt, throw immediately
				throw error;
			}
		}
	}
	
	throw new Error(`Failed to connect to event stream after ${RETRY_CONFIG.maxAttempts} attempts: ${lastError}`);
}

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
			
			// Track state across potential reconnections
			let messageComplete = false;
			let messageSent = false;
			let streamReconnectAttempt = 0;
			const MAX_STREAM_RECONNECTS = 3;
			const partTextMap = new Map<string, string>();
			
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
						await sleep(1000);
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

				// Keepalive: send ping every 10 seconds to prevent connection timeout (more aggressive than before)
				keepaliveInterval = setInterval(async () => {
					if (!messageComplete) {
						try {
							await writer.write(encoder.encode(`: keepalive\n\n`));
						} catch {
							// Writer closed, stop keepalive
							if (keepaliveInterval) clearInterval(keepaliveInterval);
						}
					}
				}, KEEPALIVE_INTERVAL_MS);

				// Build the prompt text
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
						modelID: "claude-opus-4-5",
					},
					parts: [{ type: "text", text: promptText }],
				}).replace(/'/g, "'\\''");

				// Helper to check if error is a session corruption issue (needs new session)
				const isSessionCorrupted = (parsed: any): boolean => {
					// Only session-specific errors need a new session
					if (parsed.name === "SessionNotFoundError") return true;
					if (parsed.error?.includes("session")) return true;
					// Don't treat 403 as session corruption - it's usually a transient API issue
					return false;
				};
				
				// Helper to check if error is a transient API error (needs retry with delay)
				const isTransientAPIError = (parsed: any): boolean => {
					// Direct APIError format
					if (parsed.name === "APIError" && parsed.statusCode === 403) return true;
					if (parsed.error?.type === "forbidden") return true;
					if (parsed.error?.message?.includes("Request not allowed")) return true;
					// OpenCode nested format: error is at info.error.data.statusCode (not info.error.statusCode)
					if (parsed.info?.error?.name === "APIError") {
						const statusCode = parsed.info?.error?.data?.statusCode || parsed.info?.error?.statusCode;
						if (statusCode === 403) return true;
					}
					if (parsed.info?.error?.data?.message?.includes("Request not allowed")) return true;
					// Rate limits - check all possible locations
					const rateLimit = parsed.statusCode === 429 || 
						parsed.info?.error?.statusCode === 429 || 
						parsed.info?.error?.data?.statusCode === 429;
					if (rateLimit) return true;
					return false;
				};

				// Helper to execute message with retry on errors
				const MAX_API_RETRIES = 3;
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

					// Parse result to check for errors
					if (result.stdout) {
						try {
							const parsed = JSON.parse(result.stdout);
							
							// First check for transient API errors (403, 429) - retry with delay
							if (isTransientAPIError(parsed) && retryCount < MAX_API_RETRIES) {
								const delayMs = Math.min(1000 * Math.pow(2, retryCount), 8000); // 1s, 2s, 4s, 8s
								console.log(`[${projectId}] Transient API error (attempt ${retryCount + 1}/${MAX_API_RETRIES}), retrying in ${delayMs}ms...`);
								
								// Notify client about retry
								try {
									await writer.write(encoder.encode(`data: ${JSON.stringify({ 
										type: "api_retry", 
										attempt: retryCount + 1,
										maxAttempts: MAX_API_RETRIES,
										delayMs 
									})}\n\n`));
								} catch {}
								
								await sleep(delayMs);
								
								// Retry same request
								return executeMessage(currentSessionId, retryCount + 1);
							}
							
							// Then check for session corruption - need new session
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
										modelID: "claude-opus-4-5",
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

			// Main streaming loop with reconnection support
			let messagePromise: Promise<any> | null = null;
			let sseBuffer = "";
			let messageResolved = false;
			let messageError: Error | null = null;
			
			// Inactivity timeout: if no events for 30 seconds, check if message failed
			const STREAM_INACTIVITY_TIMEOUT_MS = 30000;
			let lastActivityTime = Date.now();
			let inactivityCheckInterval: ReturnType<typeof setInterval> | null = null;
			
			// Outer loop for stream reconnection
			streamLoop: while (!messageComplete && streamReconnectAttempt < MAX_STREAM_RECONNECTS) {
				try {
					// Connect to event stream with retry
					const eventStream = await connectEventStreamWithRetry(sandbox, projectId);
					
					// Send the message only on first connection (not reconnects)
					if (!messageSent) {
						messagePromise = executeMessage(sessionId);
						messageSent = true;
						console.log(`[${projectId}] Message sent to session ${sessionId}`);
						
						// Track when the message promise resolves (for early error detection)
						messagePromise.then((result) => {
							messageResolved = true;
							// Check if result contains an error
							if (result?.stdout) {
								try {
									const parsed = JSON.parse(result.stdout);
									// Check for various error patterns
									const hasError = parsed.error || 
										parsed.info?.error ||
										(parsed.info?.error?.name === "APIError") ||
										(parsed.info?.error?.statusCode === 403);
									
									if (hasError) {
										const errorInfo = parsed.error || parsed.info?.error;
										const errorMsg = errorInfo?.message || 
											errorInfo?.data || 
											(errorInfo?.statusCode === 403 ? "API request forbidden (403)" : null) ||
											JSON.stringify(errorInfo);
										messageError = new Error(errorMsg);
										console.log(`[${projectId}] Message completed with error: ${errorMsg.substring(0, 100)}`);
									}
								} catch {}
							}
						}).catch((err) => {
							messageResolved = true;
							messageError = err;
						});
					} else {
						console.log(`[${projectId}] Reconnected to event stream (attempt ${streamReconnectAttempt + 1}), waiting for existing message response`);
					}

					// Start inactivity check
					inactivityCheckInterval = setInterval(() => {
						const inactiveFor = Date.now() - lastActivityTime;
						if (inactiveFor > STREAM_INACTIVITY_TIMEOUT_MS && messageResolved && messageError) {
							console.log(`[${projectId}] Stream inactive for ${inactiveFor}ms and message has error, breaking...`);
							// We can't break from here, but we'll flag it and the loop will check
						}
					}, 5000);

					// Process SSE events
					for await (const rawEvent of eventStream) {
						if (messageComplete) break streamLoop;
						
						// Check if the message failed - use shorter timeout (5s) when error is known
						const errorTimeout = messageError ? 5000 : STREAM_INACTIVITY_TIMEOUT_MS;
						if (messageError && (Date.now() - lastActivityTime > errorTimeout)) {
							console.log(`[${projectId}] Breaking stream loop due to message error and ${errorTimeout}ms inactivity`);
							if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);
							throw messageError;
						}
						
						// Update activity timestamp
						lastActivityTime = Date.now();
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
						// Check if this is a retryable stream error
						const errorStr = event.error || "";
						if (isRetryableError(errorStr) && streamReconnectAttempt < MAX_STREAM_RECONNECTS - 1) {
							console.log(`[${projectId}] Stream error (retryable): ${errorStr}, will reconnect...`);
							streamReconnectAttempt++;
							continue streamLoop;
						}
						throw new Error(`Stream error: ${event.error}`);
					} else if (event.type === "complete") {
						// Stream completed normally - exit the loop
						break streamLoop;
					}
				}
				
				// If we exit the for-await loop without completion, it may be a disconnect
				if (!messageComplete) {
					console.log(`[${projectId}] Event stream ended unexpectedly, checking if complete...`);
					// Give a brief moment to check if the message actually completed
					await sleep(500);
					
					// If message has an error, throw it now
					if (messageError) {
						if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);
						throw messageError;
					}
				}
				
				// Clean up inactivity check
				if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);
				
				// Normal stream completion, exit outer loop
				break streamLoop;
				
				} catch (streamError) {
				// Clean up inactivity check on error
				if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);
					// Handle stream-level errors with reconnection
					const errorStr = String(streamError);
					console.error(`[${projectId}] Stream processing error (attempt ${streamReconnectAttempt + 1}/${MAX_STREAM_RECONNECTS}):`, errorStr);
					
					if (isRetryableError(streamError) && streamReconnectAttempt < MAX_STREAM_RECONNECTS - 1) {
						streamReconnectAttempt++;
						const delay = getRetryDelay(streamReconnectAttempt - 1);
						console.log(`[${projectId}] Retryable stream error, reconnecting in ${delay}ms...`);
						
						// Send a notification to the client about reconnection
						try {
							await writer.write(encoder.encode(`data: ${JSON.stringify({ 
								type: "reconnecting", 
								attempt: streamReconnectAttempt,
								maxAttempts: MAX_STREAM_RECONNECTS 
							})}\n\n`));
						} catch {
							// Writer may be closed
						}
						
						await sleep(delay);
						continue;
					}
					
					// Non-retryable error or max retries reached
					throw streamError;
				}
				} // end while streamLoop

				// Wait for message to complete and check for errors
				const messageResult = messagePromise ? await messagePromise : null;
				if (messageResult?.stdout) {
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

// R2 key for project workspace tarball
function getR2WorkspaceKey(projectId: string): string {
	return `projects/${projectId}/workspace.tar.gz`;
}

/**
 * Check if project exists in R2 storage directly (doesn't rely on S3FS mount)
 */
async function checkProjectExistsInR2(bucket: R2Bucket, projectId: string): Promise<boolean> {
	const key = getR2WorkspaceKey(projectId);
	const object = await bucket.head(key);
	return object !== null;
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
			let writerClosed = false;
			
			// Helper to safely write to the stream (handles client disconnect gracefully)
			const safeWrite = async (data: string): Promise<boolean> => {
				if (writerClosed) return false;
				try {
					await writer.write(encoder.encode(data));
					return true;
				} catch (e) {
					// "Controller is already closed" means client disconnected - this is expected
					const msg = String(e);
					if (msg.includes("Controller is already closed") || msg.includes("closed")) {
						writerClosed = true;
						return false;
					}
					throw e; // Re-throw unexpected errors
				}
			};
			
			try {
				for await (const rawEvent of parseSSEStream(stream)) {
					if (writerClosed) break; // Exit early if client disconnected
					
					const event = rawEvent as SSEEvent;
					if (event.type === "stdout" && event.data) {
						const lines = event.data.split("\n").filter(Boolean);
						for (const line of lines) {
							if (writerClosed) break;
							
							// Check if watcher is unavailable
							if (line.trim() === "WATCHER_UNAVAILABLE") {
								if (!await safeWrite(`data: ${JSON.stringify({
									type: "error",
									error: "File watcher not available",
								})}\n\n`)) break;
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

							if (!await safeWrite(`data: ${JSON.stringify({
								type: "fs_event",
								op,
								path: relativePath,
								isDir,
							})}\n\n`)) break;
						}
					} else if (event.type === "complete") {
						await safeWrite(`data: ${JSON.stringify({
							type: "complete",
						})}\n\n`);
					} else if (event.type === "error") {
						await safeWrite(`data: ${JSON.stringify({
							type: "error",
							error: event.error,
						})}\n\n`);
					}
				}
			} catch (error) {
				// Likely aborted by client disconnect - this is expected behavior
				const errorName = (error as Error).name;
				const errorMsg = String(error);
				if (errorName !== "AbortError" && !errorMsg.includes("Controller is already closed")) {
					console.error("Files events stream error:", error);
				}
			} finally {
				if (!writerClosed) {
					try {
						await writer.close();
					} catch {
						// Writer may already be closed, ignore
					}
				}
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

// ============================================================================
// Build Handler - Build survey app for deployment
// ============================================================================

interface BuildFile {
	path: string;
	content: string; // base64 encoded
	size: number;
}

async function handleBuild(
	projectId: string,
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const appDir = getAppDir(projectId);

		console.log(`[${projectId}] Building survey app...`);

		// Check if app exists
		const checkApp = await sandbox.exec(`test -f ${appDir}/package.json`);
		if (checkApp.exitCode !== 0) {
			return new Response(
				JSON.stringify({ error: "Survey app not found. Run ensure first." }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		// Update next.config.js to enable static export
		const nextConfigPath = `${appDir}/next.config.js`;
		const exportConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
`;
		await sandbox.writeFile(nextConfigPath, exportConfig, { encoding: "utf-8" });

		// Install dependencies if needed
		const checkNodeModules = await sandbox.exec(`test -d ${appDir}/node_modules`);
		if (checkNodeModules.exitCode !== 0) {
			console.log(`[${projectId}] Installing dependencies...`);
			const installResult = await sandbox.exec(`cd ${appDir} && npm install`, {
				timeout: 120000, // 2 minutes
			});
			if (installResult.exitCode !== 0) {
				console.error(`[${projectId}] npm install failed:`, installResult.stderr || installResult.stdout);
				return new Response(
					JSON.stringify({
						error: "Failed to install dependencies",
						details: installResult.stderr || installResult.stdout,
					}),
					{ status: 500, headers: { "Content-Type": "application/json" } }
				);
			}
		}

		// Build the app
		console.log(`[${projectId}] Running build...`);
		const buildResult = await sandbox.exec(`cd ${appDir} && npm run build`, {
			timeout: 180000, // 3 minutes
		});

		if (buildResult.exitCode !== 0) {
			console.error(`[${projectId}] Build failed:`, buildResult.stderr || buildResult.stdout);
			return new Response(
				JSON.stringify({
					error: "Build failed",
					details: buildResult.stderr || buildResult.stdout,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		console.log(`[${projectId}] Build completed, collecting output files...`);

		// Get list of files in the out directory
		const outDir = `${appDir}/out`;
		const checkOut = await sandbox.exec(`test -d ${outDir}`);
		if (checkOut.exitCode !== 0) {
			return new Response(
				JSON.stringify({ error: "Build output directory not found" }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// List all files recursively
		const listResult = await sandbox.exec(
			`find ${outDir} -type f -exec stat -c '%s %n' {} \\;`
		);

		if (listResult.exitCode !== 0) {
			return new Response(
				JSON.stringify({
					error: "Failed to list build output",
					details: listResult.stderr,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		const files: BuildFile[] = [];
		const fileLines = listResult.stdout.trim().split("\n").filter(Boolean);

		for (const line of fileLines) {
			const spaceIndex = line.indexOf(" ");
			if (spaceIndex === -1) continue;

			const size = parseInt(line.substring(0, spaceIndex), 10);
			const fullPath = line.substring(spaceIndex + 1);
			const relativePath = fullPath.replace(outDir + "/", "");

			// Skip very large files (> 25MB) - Cloudflare has limits
			if (size > 25 * 1024 * 1024) {
				console.warn(`[${projectId}] Skipping large file: ${relativePath} (${size} bytes)`);
				continue;
			}

			// Read file content as base64
			const catResult = await sandbox.exec(`base64 -w 0 "${fullPath}"`);
			if (catResult.exitCode === 0 && catResult.stdout) {
				files.push({
					path: relativePath,
					content: catResult.stdout,
					size,
				});
			}
		}

		console.log(`[${projectId}] Collected ${files.length} files for deployment`);

		return new Response(
			JSON.stringify({
				success: true,
				files,
				totalFiles: files.length,
				totalSize: files.reduce((sum, f) => sum + f.size, 0),
			}),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error(`[${projectId}] Build failed:`, error);
		return new Response(
			JSON.stringify({ error: "Build failed", details: String(error) }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}

// ============================================================================
// Vercel Deploy Handler - Deploy survey app to Vercel
// ============================================================================

interface EnvWithVercel extends Env {
	VERCEL_TOKEN?: string;
	MONGODB_URI?: string;
}

async function handleDeployVercel(
	projectId: string,
	env: Env,
	sandbox: SandboxInstance
): Promise<Response> {
	try {
		const appDir = getAppDir(projectId);

		console.log(`[${projectId}] Deploying survey app to Vercel...`);

		// Check if app exists
		const checkApp = await sandbox.exec(`test -f ${appDir}/package.json`);
		if (checkApp.exitCode !== 0) {
			return new Response(
				JSON.stringify({ error: "Survey app not found. Run ensure first." }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}

		// Check if VERCEL_TOKEN is available
		const vercelToken = (env as EnvWithVercel).VERCEL_TOKEN;
		if (!vercelToken) {
			return new Response(
				JSON.stringify({ error: "VERCEL_TOKEN not configured" }),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// Remove user_files symlink before deploy (it points to local path that doesn't exist on Vercel)
		await sandbox.exec(`rm -f ${appDir}/user_files`);

		// Deploy to Vercel using CLI with environment variables
		// --build-env for NEXT_PUBLIC_* (build-time, client-side)
		// -e for runtime vars (server-side, like MONGODB_URI)
		console.log(`[${projectId}] Running Vercel deploy...`);
		const mongoUri = (env as EnvWithVercel).MONGODB_URI;
		const buildEnvVars = [
			`--build-env NEXT_PUBLIC_DEPLOYMENT=production`,
			`--build-env NEXT_PUBLIC_SURVEY_ID=${projectId}`,
		].join(" ");
		const runtimeEnvVars = [
			mongoUri ? `-e MONGODB_URI="${mongoUri}"` : "",
		].filter(Boolean).join(" ");
		const deployCmd = `cd ${appDir} && vercel deploy --yes --prod --token=${vercelToken} ${buildEnvVars} ${runtimeEnvVars} 2>&1`;
		const deployResult = await sandbox.exec(deployCmd, {
			timeout: 300000, // 5 minutes timeout for build + deploy
		});

		console.log(`[${projectId}] Vercel output:`, deployResult.stdout);

		if (deployResult.exitCode !== 0) {
			console.error(`[${projectId}] Vercel deployment failed:`, deployResult.stdout || deployResult.stderr);
			return new Response(
				JSON.stringify({
					success: false,
					error: "Vercel deployment failed",
					details: deployResult.stdout || deployResult.stderr,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		// Parse the Production URL from output
		// Format: "Production: https://app-xxxxx.vercel.app [41s]"
		const output = deployResult.stdout || "";
		const productionMatch = output.match(/Production:\s+(https:\/\/[^\s\[]+)/);
		const deployedUrl = productionMatch?.[1];
		
		// Extract inspector URL from output (optional, for debugging)
		const inspectMatch = output.match(/Inspect:\s+(https:\/\/[^\s\[]+)/);
		const inspectorUrl = inspectMatch?.[1];

		if (!deployedUrl) {
			console.error(`[${projectId}] Could not parse production URL from Vercel output`);
			return new Response(
				JSON.stringify({
					success: false,
					error: "Deployment succeeded but could not find production URL",
					details: output,
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}

		console.log(`[${projectId}] Deployment successful: ${deployedUrl}`);

		return new Response(
			JSON.stringify({
				success: true,
				url: deployedUrl,
				inspectorUrl,
			}),
			{ headers: { "Content-Type": "application/json" } }
		);
	} catch (error) {
		console.error(`[${projectId}] Vercel deployment failed:`, error);
		return new Response(
			JSON.stringify({ error: "Vercel deployment failed", details: String(error) }),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
}
