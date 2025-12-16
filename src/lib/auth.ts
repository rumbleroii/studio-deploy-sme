import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Find or create user in MongoDB
  let dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: user.id },
  });

  if (!dbUser) {
    // Check if this should be an admin (first user or in INITIAL_ADMIN_EMAILS)
    const userCount = await prisma.user.count();
    const initialAdminEmails = process.env.INITIAL_ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase()
    ) || [];
    
    const shouldBeAdmin =
      userCount === 0 ||
      (user.email && initialAdminEmails.includes(user.email.toLowerCase()));

    dbUser = await prisma.user.create({
      data: {
        supabaseUserId: user.id,
        email: user.email || "",
        role: shouldBeAdmin ? Role.admin : Role.viewer,
      },
    });
  }

  return dbUser;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

export function canAccessUsersPage(role: Role): boolean {
  return role === Role.admin || role === Role.editor;
}

export function canEditRoles(role: Role): boolean {
  return role === Role.admin;
}

