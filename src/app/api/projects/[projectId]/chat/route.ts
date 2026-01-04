import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Allow 300s for long chat operations (AI can take time)
export const maxDuration = 300;

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;

		// Verify project ownership
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { id: true, createdById: true },
		});

		if (!project || project.createdById !== user.id) {
			return NextResponse.json({ error: "Not Found" }, { status: 404 });
		}

		const messages = await prisma.projectMessage.findMany({
			where: { projectId },
			orderBy: { createdAt: "asc" },
			select: {
				id: true,
				role: true,
				content: true,
				createdAt: true,
			},
		});

		return NextResponse.json({ messages });
	} catch (error) {
		console.error("Get messages error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;
		const body = await request.json();
		const { message, sessionId } = body ?? {};

		if (!message) {
			return NextResponse.json({ error: "Message required" }, { status: 400 });
		}

		// Verify project ownership
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { id: true, createdById: true, claudeSessionId: true },
		});

		if (!project || project.createdById !== user.id) {
			return NextResponse.json({ error: "Not Found" }, { status: 404 });
		}

		// Save user message
		await prisma.projectMessage.create({
			data: {
				projectId,
				role: "user",
				content: message,
			},
		});

		// Fetch recent history (e.g., last 20 messages)
		const history = await prisma.projectMessage.findMany({
			where: { projectId },
			orderBy: { createdAt: "asc" },
			take: 20,
			select: { role: true, content: true },
		});

		// Call worker chat endpoint
		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			return NextResponse.json(
				{ error: "Worker not configured" },
				{ status: 500 }
			);
		}

		// No timeout for streaming - use AbortController from request signal
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
					sessionId: sessionId || project.claudeSessionId,
					history, // Pass history to worker
				}),
				// Pass through client's abort signal for cancellation
				signal: request.signal,
			}
		);

		if (!workerResponse.ok || !workerResponse.body) {
			const errorText = await workerResponse.text();
			console.error("Worker chat failed:", workerResponse.status, errorText);
			return NextResponse.json({ error: "Chat failed" }, { status: 502 });
		}

		// Stream response back to client
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();

		(async () => {
			const reader = workerResponse.body!.getReader();
			const decoder = new TextDecoder();
			let assistantContent = "";
			let newSessionId: string | undefined;

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					await writer.write(new TextEncoder().encode(chunk));

					// Parse SSE to capture content and session ID
					const lines = chunk.split("\n");
					for (const line of lines) {
						if (line.startsWith("data: ")) {
							try {
								const data = JSON.parse(line.slice(6));
								if (data.type === "delta" && data.text) {
									assistantContent += data.text;
								} else if (data.type === "session_id") {
									newSessionId = data.sessionId;
								}
							} catch {}
						}
					}
				}

				// Save assistant message
				if (assistantContent) {
					await prisma.projectMessage.create({
						data: {
							projectId,
							role: "assistant",
							content: assistantContent,
						},
					});
				}

				// Update session ID if changed
				if (newSessionId && newSessionId !== project.claudeSessionId) {
					await prisma.project.update({
						where: { id: projectId },
						data: { claudeSessionId: newSessionId },
					});
				}
			} catch (error) {
				console.error("Stream error:", error);
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
		console.error("Chat error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
