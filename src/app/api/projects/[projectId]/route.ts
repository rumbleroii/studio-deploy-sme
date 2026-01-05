import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
	params: Promise<{ projectId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
	try {
		const user = await requireAuth();
		const { projectId } = await params;

		const project = await prisma.project.findUnique({
			where: { id: projectId },
			// Avoid selecting fields that may be null in older docs (e.g. updatedAt).
			select: {
				id: true,
				name: true,
				claudeSessionId: true,
				createdById: true,
				createdAt: true,
				messages: {
					orderBy: { createdAt: "asc" },
					select: {
						id: true,
						role: true,
						content: true,
						runId: true,
						status: true,
						streamSeq: true,
						error: true,
						createdAt: true,
					},
				},
			},
		});

		if (!project || project.createdById !== user.id) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		return NextResponse.json(project);
	} catch (error) {
		console.error("Failed to fetch project:", error);
		return NextResponse.json(
			{ error: "Failed to fetch project" },
			{ status: 500 }
		);
	}
}
