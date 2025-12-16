import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, canEditRoles } from "@/lib/auth";
import { Role } from "@prisma/client";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const currentUser = await requireRole([Role.admin]);

    if (!canEditRoles(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent self-demotion
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

