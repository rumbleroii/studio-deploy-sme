import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth, canAccessUsersPage, canEditRoles } from "@/lib/auth";
import { UsersTable } from "@/components/users/users-table";

export default async function UsersPage() {
  const currentUser = await requireAuth();

  if (!canAccessUsersPage(currentUser.role)) {
    redirect("/projects");
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

  return (
    <div className="h-full">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
      </div>

      {/* Content */}
      <div className="p-6">
        <UsersTable
          users={users}
          currentUserId={currentUser.id}
          canEdit={canEditRoles(currentUser.role)}
        />
      </div>
    </div>
  );
}
