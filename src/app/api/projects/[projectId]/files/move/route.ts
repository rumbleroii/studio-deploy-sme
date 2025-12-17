import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ projectId: string }> }
) {
	const params = await props.params;
	try {
		const session = await requireAuth();
		if (!session) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const projectId = params.projectId;
		const body = await request.json();

		const workerUrl = process.env.AGENT_WORKER_URL;
		const workerSecret = process.env.AGENT_WORKER_SHARED_SECRET;

		if (!workerUrl || !workerSecret) {
			console.error("Agent worker not configured");
			return NextResponse.json(
				{ error: "Agent worker not configured" },
				{ status: 500 }
			);
		}

		const res = await fetch(
			`${workerUrl}/v1/projects/${projectId}/files/move`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Shared-Secret": workerSecret,
				},
				body: JSON.stringify(body),
			}
		);

		if (!res.ok) {
			const errorText = await res.text();
			console.error("Worker move failed:", errorText);
			return NextResponse.json(
				{ error: "Failed to move file" },
				{ status: res.status }
			);
		}

		const data = await res.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Move file error:", error);
		return NextResponse.json({ error: "Failed to move file" }, { status: 500 });
	}
}
