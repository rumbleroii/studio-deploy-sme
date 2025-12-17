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
		const { runId } = body;

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

		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			return NextResponse.json(
				{ error: "Internal Server Error" },
				{ status: 500 }
			);
		}

		// Call Worker to cancel the run
		const workerResponse = await fetch(
			`${workerUrl}/v1/projects/${projectId}/runs/${runId}/cancel`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
			}
		);

		if (!workerResponse.ok) {
			const errorText = await workerResponse.text();
			console.error("Worker cancel failed:", workerResponse.status, errorText);
			return NextResponse.json({ error: "Worker Error" }, { status: 502 });
		}

		// Update the assistant message status to error/cancelled
		await prisma.projectMessage.updateMany({
			where: {
				projectId,
				runId,
				role: "assistant",
				status: "streaming",
			},
			data: {
				status: "error",
				error: "Cancelled by user",
			},
		});

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Chat cancel error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
