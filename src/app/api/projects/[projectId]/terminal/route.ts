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

		const project = await prisma.project.findUnique({
			where: { id: projectId },
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

		const body = await request.json();

		const response = await fetch(
			`${workerUrl}/v1/projects/${projectId}/terminal`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": sharedSecret,
				},
				body: JSON.stringify(body),
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Worker terminal failed:", response.status, errorText);
			return new NextResponse("Worker Error", { status: 502 });
		}

		if (!response.body) {
			return new NextResponse("No response body", { status: 502 });
		}

		// Stream the terminal output to the client
		return new Response(response.body, {
			headers: {
				"Content-Type": "application/octet-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Terminal error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}

