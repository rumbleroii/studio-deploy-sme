import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Batch DB updates for efficiency
const DB_UPDATE_INTERVAL_MS = 500;
const DB_UPDATE_EVENT_THRESHOLD = 10;

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;

		const url = new URL(request.url);
		const runId = url.searchParams.get("runId");
		const lastEventIdHeader = request.headers.get("Last-Event-ID");
		const fromSeqParam = url.searchParams.get("fromSeq");
		const fromSeq = Number(fromSeqParam || lastEventIdHeader || "0") || 0;

		if (!runId) {
			return NextResponse.json({ error: "runId required" }, { status: 400 });
		}

		// Verify project ownership
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			// Avoid selecting fields that may be null in older docs (e.g. updatedAt).
			select: {
				createdById: true,
			},
		});

		if (!project || project.createdById !== user.id) {
			return NextResponse.json({ error: "Not Found" }, { status: 404 });
		}

		// Find the assistant message for this run
		const assistantMessage = await prisma.projectMessage.findFirst({
			where: { projectId, runId, role: "assistant" },
			// Avoid selecting fields that may be null in older docs (e.g. updatedAt).
			select: {
				id: true,
				content: true,
				streamSeq: true,
			},
		});

		if (!assistantMessage) {
			return NextResponse.json({ error: "Run not found" }, { status: 404 });
		}

		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			return NextResponse.json(
				{ error: "Internal Server Error" },
				{ status: 500 }
			);
		}

		// Create an AbortController to pass the signal to the worker request
		const abortController = new AbortController();
		request.signal.addEventListener("abort", () => {
			abortController.abort();
		});

		let workerResponse: Response;
		try {
			workerResponse = await fetch(
				`${workerUrl}/v1/projects/${projectId}/runs/${runId}/stream?fromSeq=${fromSeq}`,
				{
					method: "GET",
					headers: {
						"X-Shared-Secret": sharedSecret,
					},
					signal: abortController.signal,
				}
			);
		} catch (fetchError) {
			console.error(
				"Worker stream fetch error:",
				fetchError,
				`URL: ${workerUrl}/v1/projects/${projectId}/runs/${runId}/stream?fromSeq=${fromSeq}`
			);
			// Return SSE error event instead of JSON so EventSource can handle it
			const errorMsg =
				fetchError instanceof Error
					? fetchError.message
					: "Failed to connect to worker";
			const stream = new ReadableStream({
				start(controller) {
					const encoder = new TextEncoder();
					controller.enqueue(
						encoder.encode(
							`event: error\ndata: ${JSON.stringify({
								seq: -1,
								type: "error",
								error: errorMsg,
							})}\n\n`
						)
					);
					controller.close();
				},
			});
			return new NextResponse(stream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}

		if (!workerResponse.ok) {
			const errorText = await workerResponse.text();
			console.error(
				"Worker stream failed:",
				workerResponse.status,
				errorText,
				`URL: ${workerUrl}/v1/projects/${projectId}/runs/${runId}/stream?fromSeq=${fromSeq}`
			);
			// Return SSE error event instead of JSON so EventSource can handle it
			const stream = new ReadableStream({
				start(controller) {
					const encoder = new TextEncoder();
					controller.enqueue(
						encoder.encode(
							`event: error\ndata: ${JSON.stringify({
								seq: -1,
								type: "error",
								error:
									errorText || `Worker returned HTTP ${workerResponse.status}`,
							})}\n\n`
						)
					);
					controller.close();
				},
			});
			return new NextResponse(stream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}

		if (!workerResponse.body) {
			return NextResponse.json({ error: "No stream body" }, { status: 502 });
		}

		// State for incremental DB updates
		let accumulatedContent = assistantMessage.content || "";
		let lastDbUpdateSeq = assistantMessage.streamSeq || 0;
		let lastDbUpdateTime = Date.now();
		let pendingEvents = 0;
		let sessionId: string | null = null;
		let isComplete = false;
		let errorMsg: string | null = null;

		const flushToDb = async (finalSeq: number, force = false) => {
			const now = Date.now();
			const timeSinceLastUpdate = now - lastDbUpdateTime;
			const shouldUpdate =
				force ||
				pendingEvents >= DB_UPDATE_EVENT_THRESHOLD ||
				timeSinceLastUpdate >= DB_UPDATE_INTERVAL_MS;

			if (!shouldUpdate || finalSeq <= lastDbUpdateSeq) return;

			try {
				await prisma.projectMessage.update({
					where: { id: assistantMessage.id },
					data: {
						content: accumulatedContent,
						streamSeq: finalSeq,
						...(isComplete && { status: "complete" }),
						...(errorMsg && { status: "error", error: errorMsg }),
					},
				});

				// Update session ID on project if we got one
				if (sessionId && isComplete) {
					await prisma.project.update({
						where: { id: projectId },
						data: { claudeSessionId: sessionId },
					});
				}

				lastDbUpdateSeq = finalSeq;
				lastDbUpdateTime = now;
				pendingEvents = 0;
			} catch (err) {
				console.error("Failed to update assistant message:", err);
			}
		};

		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();

		// Process the worker stream
		(async () => {
			const reader = workerResponse.body!.getReader();
			let buffer = "";

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					// Pass through to client
					await writer.write(value);

					// Parse SSE events for DB updates
					buffer += decoder.decode(value, { stream: true });

					// Process complete lines
					let idx: number;
					while ((idx = buffer.indexOf("\n\n")) !== -1) {
						const block = buffer.slice(0, idx);
						buffer = buffer.slice(idx + 2);

						// Parse SSE block
						const lines = block.split("\n");
						let eventType = "message";
						let eventData = "";
						let eventId = "";

						for (const line of lines) {
							if (line.startsWith("event: ")) {
								eventType = line.slice(7);
							} else if (line.startsWith("data: ")) {
								eventData = line.slice(6);
							} else if (line.startsWith("id: ")) {
								eventId = line.slice(4);
							}
						}

						if (!eventData) continue;

						// Skip ping events
						if (eventType === "ping") continue;

						try {
							const payload = JSON.parse(eventData);
							const seq = Number(payload.seq || eventId || 0);

							if (payload.type === "delta" && payload.text) {
								accumulatedContent += payload.text;
								pendingEvents++;
								await flushToDb(seq);
							} else if (payload.type === "session_id" && payload.sessionId) {
								sessionId = payload.sessionId;
							} else if (payload.type === "done") {
								isComplete = true;
								await flushToDb(seq, true);
							} else if (payload.type === "error") {
								errorMsg = payload.error || "Unknown error";
								await flushToDb(seq, true);
							}
						} catch {
							// Ignore parse errors
						}
					}
				}

				// Final flush
				if (pendingEvents > 0 || isComplete || errorMsg) {
					await flushToDb(lastDbUpdateSeq + pendingEvents, true);
				}
			} catch (error) {
				if ((error as Error).name !== "AbortError") {
					console.error("Stream processing error:", error);
				}
			} finally {
				try {
					await writer.close();
				} catch {}
			}
		})();

		return new NextResponse(readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		if ((error as Error).name !== "AbortError") {
			console.error("Chat stream error:", error);
		}
		// Return SSE error event so EventSource can handle it
		const errorMsg =
			error instanceof Error ? error.message : "Internal Server Error";
		const stream = new ReadableStream({
			start(controller) {
				const encoder = new TextEncoder();
				controller.enqueue(
					encoder.encode(
						`event: error\ndata: ${JSON.stringify({
							seq: -1,
							type: "error",
							error: errorMsg,
						})}\n\n`
					)
				);
				controller.close();
			},
		});
		return new NextResponse(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	}
}
