import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const user = await requireAuth();
		const { projectId } = params;

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			// Avoid selecting fields that may be null in older docs (e.g. updatedAt).
			select: { createdById: true },
		});

		if (!project || project.createdById !== user.id) {
			return new NextResponse("Not Found", { status: 404 });
		}

		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			return new NextResponse("Internal Server Error", { status: 500 });
		}

		// Create an AbortController to pass the signal to the worker request
		const abortController = new AbortController();

		// Abort when client disconnects
		request.signal.addEventListener("abort", () => {
			abortController.abort();
		});

		const response = await fetch(
			`${workerUrl}/v1/projects/${projectId}/files/events`,
			{
				method: "GET",
				headers: {
					"X-Shared-Secret": sharedSecret,
				},
				signal: abortController.signal,
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Worker files events failed:", response.status, errorText);
			return new NextResponse("Worker Error", { status: 502 });
		}

		// Proxy the SSE stream
		return new NextResponse(response.body, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		// Don't log abort errors
		if ((error as Error).name !== "AbortError") {
			console.error("Files events error:", error);
		}
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
