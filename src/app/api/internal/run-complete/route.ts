import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Phase 2: Internal callback endpoint for guaranteed persistence.
 * Called by the runner when a run completes, ensuring the assistant message
 * is persisted to the database even if no client is connected to stream.
 */
export async function POST(request: NextRequest) {
	try {
		// Validate callback secret
		const callbackSecret = request.headers.get("X-Callback-Secret");
		const expectedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!callbackSecret || callbackSecret !== expectedSecret) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { runId, projectId, status, content, sessionId, error } = body;

		if (!runId || !projectId) {
			return NextResponse.json(
				{ error: "runId and projectId required" },
				{ status: 400 }
			);
		}

		// Find the assistant message for this run
		const assistantMessage = await prisma.projectMessage.findFirst({
			where: {
				projectId,
				runId,
				role: "assistant",
			},
		});

		if (!assistantMessage) {
			// Message might have been deleted or doesn't exist
			console.warn(
				`Run complete callback: assistant message not found for runId=${runId}`
			);
			return NextResponse.json({ ok: true, skipped: true });
		}

		// Idempotency: skip if already complete
		if (assistantMessage.status === "complete") {
			return NextResponse.json({ ok: true, alreadyComplete: true });
		}

		// Determine final status
		const finalStatus = status === "error" ? "error" : "complete";

		// Update the assistant message with final content
		await prisma.projectMessage.update({
			where: { id: assistantMessage.id },
			data: {
				content: content || assistantMessage.content,
				status: finalStatus,
				error: error || null,
			},
		});

		// Update session ID on project if provided
		if (sessionId) {
			await prisma.project.update({
				where: { id: projectId },
				data: { claudeSessionId: sessionId },
			});
		}

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error("Run complete callback error:", err);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
