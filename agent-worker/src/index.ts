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
		const filesDownloadMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/files\/download$/
		);
		const filesEventsMatch = path.match(
			/^\/v1\/projects\/([^/]+)\/files\/events$/
		);

		const validateProjectId = (id: string): boolean =>
			/^[a-zA-Z0-9_-]+$/.test(id);

		if (request.method === "POST" && ensureMatch) {
			if (!validateProjectId(ensureMatch[1])) {
				return new Response(JSON.stringify({ error: "Invalid projectId" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
			return handleEnsure(ensureMatch[1], request, env);
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
		const stream = await sandbox.execStream(
			`inotifywait -m -r -e create,delete,modify,move --format '%e %w%f' "${workingDir}" 2>/dev/null || echo "WATCHER_UNAVAILABLE"`,
			{
				signal: request.signal,
			}
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
