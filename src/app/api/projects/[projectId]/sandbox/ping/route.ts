import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Ping should be fast
export const maxDuration = 10;

/**
 * Lightweight ping endpoint to keep the sandbox alive.
 * Called periodically by the frontend while the project is open.
 */
export async function POST(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;

		// Quick auth check - just verify the project exists and user owns it
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: { createdById: true },
		});

		if (!project || project.createdById !== user.id) {
			return new NextResponse("Not Found", { status: 404 });
		}

		// Call the Worker's ping endpoint
		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			return new NextResponse("Internal Server Error", { status: 500 });
		}

		const response = await fetch(
			`${workerUrl}/v1/projects/${projectId}/ping`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
			}
		);

		if (!response.ok) {
			// Don't fail the whole request - ping is best-effort
			console.warn(`Ping failed for ${projectId}:`, response.status);
			return NextResponse.json({ status: "ok", projectId });
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		// Ping failures shouldn't break the app
		console.warn("Ping error:", error);
		return NextResponse.json({ status: "ok" });
	}
}


