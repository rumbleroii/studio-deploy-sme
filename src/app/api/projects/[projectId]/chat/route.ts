import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;
		const body = await request.json();
		const { message } = body;

		if (!message) {
			return new NextResponse("Message required", { status: 400 });
		}

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			include: {
				messages: {
					orderBy: { createdAt: "asc" },
					// Limit history context if needed, but for now take all (or last N)
					take: 20,
				},
			},
		});

		if (!project || project.createdById !== user.id) {
			return new NextResponse("Not Found", { status: 404 });
		}

		// 1. Save User Message
		await prisma.projectMessage.create({
			data: {
				projectId,
				role: "user",
				content: message,
			},
		});

		// 2. Call Worker Chat Endpoint
		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			return new NextResponse("Internal Server Error", { status: 500 });
		}

		const workerResponse = await fetch(
			`${workerUrl}/v1/projects/${projectId}/chat`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
				body: JSON.stringify({
					message,
					history: project.messages.map((m) => ({
						role: m.role,
						content: m.content,
					})),
					researchObjectiveText: project.researchObjectiveText,
					claudeSessionId: project.claudeSessionId,
				}),
			}
		);

		if (!workerResponse.ok) {
			const error = await workerResponse.text();
			console.error("Worker chat failed:", error);
			return new NextResponse("Worker Error", { status: 502 });
		}

		// 3. Proxy the stream to the client
		// We also need to intercept the stream to persist the assistant's full response
		// and the session ID when complete.

		const encoder = new TextEncoder();
		const decoder = new TextDecoder();

		let assistantFullContent = "";
		let newSessionId: string | null = null;

		const stream = new ReadableStream({
			async start(controller) {
				if (!workerResponse.body) return;
				const reader = workerResponse.body.getReader();

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });

						// Pass through the chunk to the client
						controller.enqueue(value);

						// Parse SSE data for our persistence needs
						// Note: The chunks might contain multiple SSE lines or partial lines.
						// A robust parser is ideal, but for this simplified proxy we will look for patterns.
						// This simple string matching is brittle for split chunks but sufficient for v1.
						const lines = chunk.split("\n");
						for (const line of lines) {
							if (line.startsWith("data: ")) {
								try {
									const jsonStr = line.slice(6);
									if (!jsonStr.trim()) continue;

									const event = JSON.parse(jsonStr);

									if (event.type === "stdout") {
										assistantFullContent += event.data;
									} else if (event.type === "session_id") {
										newSessionId = event.sessionId;
									}
								} catch (e) {
									// ignore parse errors in stream
								}
							}
						}
					}
				} finally {
					controller.close();

					// 4. Async Persistence (Fire and forget from the request's perspective)
					// Note: In serverless, we should await this before function exit,
					// but Next.js Streaming allows background work if we are careful.
					// For safety in Vercel/Next.js, we should do this before closing if possible,
					// or use `waitUntil` (available in workers/edge, but here we are Node runtime).
					// We'll await it here to be safe.

					if (assistantFullContent) {
						try {
							await prisma.projectMessage.create({
								data: {
									projectId,
									role: "assistant",
									content: assistantFullContent,
								},
							});

							if (newSessionId) {
								await prisma.project.update({
									where: { id: projectId },
									data: { claudeSessionId: newSessionId },
								});
							}
						} catch (err) {
							console.error("Failed to persist assistant message:", err);
						}
					}
				}
			},
		});

		return new NextResponse(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Chat proxy error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
