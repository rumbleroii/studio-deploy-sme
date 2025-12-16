import { redirect } from "next/navigation";
import { getCurrentUser, canAccessUsersPage } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        email: user.email,
        role: user.role,
      }}
      canAccessUsers={canAccessUsersPage(user.role)}
    >
      {children}
    </AppShell>
  );
}

