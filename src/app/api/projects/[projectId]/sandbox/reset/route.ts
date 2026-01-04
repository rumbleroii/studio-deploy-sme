import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Allow 60s for reset operations
export const maxDuration = 60;

/**
 * Reset a broken sandbox container.
 * This kills all processes, unmounts storage, deletes workspace,
 * and clears cached session state. Next ensure will restore from R2.
 */
export async function POST(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;

		// Verify project exists and user owns it
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { createdById: true },
		});

		if (!project || project.createdById !== user.id) {
			return new NextResponse("Not Found", { status: 404 });
		}

		// Call the Worker's reset endpoint
		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			return new NextResponse("Internal Server Error", { status: 500 });
		}

		const response = await fetch(
			`${workerUrl}/v1/projects/${projectId}/reset`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
			}
		);

		if (!response.ok) {
			const text = await response.text();
			console.error(`Reset failed for ${projectId}:`, response.status, text);
			return new NextResponse(`Reset failed: ${text}`, { status: response.status });
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Reset error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}

