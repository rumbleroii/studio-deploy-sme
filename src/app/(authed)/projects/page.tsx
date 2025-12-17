import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ProjectList } from "@/components/projects/project-list";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { Skeleton } from "@/components/ui/skeleton";

async function ProjectsContent() {
	const user = await requireAuth();

	const projects = await prisma.project.findMany({
		where: { createdById: user.id },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			name: true,
			createdAt: true,
		},
	});

	return <ProjectList projects={projects} />;
}

function ProjectsLoading() {
	return (
		<div className="bg-white rounded-md border border-gray-200">
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={i}
					className="px-6 py-4 border-b border-gray-200 last:border-b-0"
				>
					<Skeleton className="h-5 w-48" />
				</div>
			))}
		</div>
	);
}

export default function ProjectsPage() {
	return (
		<div className="h-full">
			{/* Page Header */}
			<div className="bg-white border-b border-gray-200 px-6 py-4">
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-semibold text-gray-900">Projects</h1>
					<NewProjectDialog />
				</div>
			</div>

			{/* Content */}
			<div className="p-6">
				<Suspense fallback={<ProjectsLoading />}>
					<ProjectsContent />
				</Suspense>
			</div>
		</div>
	);
}
