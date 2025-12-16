import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ProjectView } from "@/components/projects/project-view";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const user = await requireAuth();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
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
        researchObjectiveText: project.researchObjectiveText,
      }}
      initialMessages={project.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}

