import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();

    const projects = await prisma.project.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        researchObjectiveText: true,
        createdAt: true,
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { name, researchObjectiveText, objectiveSource } = body;

    if (!name || !researchObjectiveText) {
      return NextResponse.json(
        { error: "Name and research objective are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        researchObjectiveText,
        objectiveSource: objectiveSource || "text",
        sandboxId: null,
        createdById: user.id,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

