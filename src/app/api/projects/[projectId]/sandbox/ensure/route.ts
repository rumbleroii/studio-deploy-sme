import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Allow 120s for cold starts (worker cold start can be ~40s)
export const maxDuration = 120;

/**
 * Query Docker API to get the host port mapped to a container port.
 * Only works in local dev where Docker socket is accessible.
 */
async function getDockerMappedPort(containerPort: number): Promise<number | null> {
	try {
		const { execSync } = await import("child_process");
		
		// Use docker CLI to get port mapping for any sandbox container
		const result = execSync(
			`docker ps --format '{{.Ports}}' 2>/dev/null || true`,
			{ encoding: "utf-8" }
		);
				
		// Parse output like "0.0.0.0:55443->3001/tcp" or "55443->3001/tcp"
		const portMatch = result.match(new RegExp(`(\\d+)->${containerPort}/tcp`));
		if (portMatch) {
			console.log(`[Docker port detection] Found mapped port: ${portMatch[1]}`);
			return parseInt(portMatch[1], 10);
		}
		
		console.log("[Docker port detection] No port mapping found");
		return null;
	} catch (error) {
		console.error("[Docker port detection] Error:", error);
		return null;
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

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			// Avoid selecting fields that may be null in older docs (e.g. updatedAt).
			select: {
				createdById: true,
			},
		});

		if (!project || project.createdById !== user.id) {
			return new NextResponse("Not Found", { status: 404 });
		}

		// Call the Worker's ensure endpoint
		const workerUrl = process.env.AGENT_WORKER_URL;
		const sharedSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !sharedSecret) {
			console.error("Missing worker config");
			return new NextResponse("Internal Server Error", { status: 500 });
		}

		// Create abort controller with 90s timeout (cold start can be ~40s)
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 90000);

		let response: Response;
		try {
			response = await fetch(
				`${workerUrl}/v1/projects/${projectId}/ensure`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Shared-Secret": sharedSecret,
					},
					body: JSON.stringify({}),
					signal: controller.signal,
				}
			);
		} finally {
			clearTimeout(timeoutId);
		}

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Worker ensure failed:", response.status, errorText);
			return new NextResponse("Worker Error", { status: 502 });
		}

		const data = await response.json();

		// Only use Docker port detection for truly local workers (not prod workers accessed from local dev)
		const isLocalWorker = workerUrl.includes("localhost") || workerUrl.includes("127.0.0.1");
		
		if (isLocalWorker) {
			// First check for manual override
			const localPreviewUrl = process.env.LOCAL_PREVIEW_URL;
			if (localPreviewUrl) {
				data.previewUrl = localPreviewUrl;
			} else {
				// Try to auto-detect from Docker
				const mappedPort = await getDockerMappedPort(3001);
				if (mappedPort) {
					data.previewUrl = `http://localhost:${mappedPort}`;
					console.log("Set previewUrl from Docker:", data.previewUrl);
				}
			}
		}
		// For production workers, use the previewUrl returned by the worker (Cloudflare exposed port)

		return NextResponse.json(data);
	} catch (error) {
		console.error("Ensure sandbox error:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
