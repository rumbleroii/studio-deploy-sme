import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ProjectView } from "@/components/projects/project-view";

interface ProjectPageProps {
	params: Promise<{ projectId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProjectPage({
	params,
	searchParams,
}: ProjectPageProps) {
	const { projectId } = await params;
	const search = await searchParams;
	const isDevMode = search.dev === "true";
	const user = await requireAuth();

	const project = await prisma.project.findUnique({
		where: { id: projectId },
		// Avoid selecting fields that may be null in older docs (e.g. updatedAt).
		select: {
			id: true,
			name: true,
			createdById: true,
			messages: {
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					role: true,
					content: true,
					createdAt: true,
					runId: true,
					status: true,
					streamSeq: true,
					error: true,
				},
			},
		},
	});

	if (!project || project.createdById !== user.id) {
		notFound();
	}

	return (
		<ProjectView
			project={{
				id: project.id,
				name: project.name,
			}}
			initialMessages={project.messages.map((m) => ({
				id: m.id,
				role: m.role,
				content: m.content,
				createdAt: m.createdAt.toISOString(),
				runId: m.runId ?? undefined,
				status: m.status,
				streamSeq: m.streamSeq,
				error: m.error ?? undefined,
			}))}
			isDevMode={isDevMode}
		/>
	);
}
