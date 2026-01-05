import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { deployToVercel } from "@/lib/deployment/vercel";

interface RouteParams {
	params: Promise<{ projectId: string }>;
}

interface PublishRequestBody {
	surveyData?: unknown;
	settings?: {
		expiresAt?: string;
		maxResponses?: number;
		allowMultipleResponses?: boolean;
	};
}

/**
 * POST /api/projects/[projectId]/publish
 * Publish/deploy a survey to Vercel
 */
export async function POST(request: Request, { params }: RouteParams) {
	try {
		const user = await requireAuth();
		const { projectId } = await params;

		// Verify project ownership
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			select: {
				id: true,
				name: true,
				createdById: true,
				deploymentStatus: true,
				surveyVersion: true,
			},
		});

		if (!project || project.createdById !== user.id) {
			return NextResponse.json(
				{ success: false, error: "Project not found" },
				{ status: 404 }
			);
		}

		// Parse request body (optional)
		let body: PublishRequestBody = {};
		try {
			body = await request.json();
		} catch {
			// Empty body is fine
		}

		console.log(`Publishing project ${projectId} to Vercel...`);

		// Deploy to Vercel (handles build + deploy in one step)
		const deployResult = await deployToVercel(projectId);

		if (!deployResult.success || !deployResult.url) {
			await prisma.project.update({
				where: { id: projectId },
				data: {
					deploymentStatus: "error",
					lastHealthCheck: new Date(),
					healthCheckStatus: false,
				},
			});

			return NextResponse.json(
				{
					success: false,
					error: deployResult.error || "Deployment failed",
					details: deployResult.details,
				},
				{ status: 500 }
			);
		}

		console.log(`Deployment successful: ${deployResult.url}`);

		// Update project with deployment info
		const deployedAt = new Date();
		const isFirstPublish = project.deploymentStatus === "draft";
		const newVersion = isFirstPublish ? 1 : (project.surveyVersion || 0) + 1;

		const updatedProject = await prisma.project.update({
			where: { id: projectId },
			data: {
				deploymentStatus: "deployed",
				deployedUrl: deployResult.url,
				deployedAt,
				surveyVersion: newVersion,
				lastHealthCheck: deployedAt,
				healthCheckStatus: true,
			},
		});

		return NextResponse.json({
			success: true,
			deployedUrl: updatedProject.deployedUrl,
			surveyVersion: updatedProject.surveyVersion,
			deployedAt: updatedProject.deployedAt?.toISOString(),
			projectName: deployResult.projectName,
		});
	} catch (error) {
		console.error("Failed to publish survey:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to publish survey",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

