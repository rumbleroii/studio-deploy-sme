import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

		// Get path from query params
		const url = new URL(request.url);
		const filePath = url.searchParams.get("path");

		if (!filePath) {
			return new NextResponse("Path parameter required", { status: 400 });
		}

		const response = await fetch(
			`${workerUrl}/v1/projects/${projectId}/files/download?path=${encodeURIComponent(
				filePath
			)}`,
			{
				method: "GET",
				headers: {
					"X-Shared-Secret": sharedSecret,
				},
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				"Worker files download failed:",
				response.status,
				errorText
			);
			return new NextResponse("Worker Error", { status: 502 });
		}

		// Proxy the streaming response
		const headers = new Headers();
		headers.set(
			"Content-Type",
			response.headers.get("Content-Type") || "application/octet-stream"
		);
		const contentDisposition = response.headers.get("Content-Disposition");
		if (contentDisposition) {
			headers.set("Content-Disposition", contentDisposition);
		}

		return new NextResponse(response.body, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Files download error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
