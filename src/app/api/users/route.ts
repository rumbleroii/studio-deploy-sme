import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, canAccessUsersPage } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const user = await requireRole([Role.admin, Role.editor]);

    if (!canAccessUsersPage(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

