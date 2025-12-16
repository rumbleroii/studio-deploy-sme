import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Increase body size limit for file uploads (10MB)
export const config = {
	api: {
		bodyParser: {
			sizeLimit: "10mb",
		},
	},
};

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
			`${workerUrl}/v1/projects/${projectId}/files/write`,
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
			console.error("Worker files write failed:", response.status, errorText);
			return new NextResponse("Worker Error", { status: 502 });
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Files write error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}

