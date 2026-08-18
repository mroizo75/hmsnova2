import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SuperAdminNav } from "@/components/superadmin-nav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.isSuperAdmin && !user?.isSupport) {
    redirect("/dashboard");
  }

  const openSupportCount = await prisma.supportTicket.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden lg:flex-row">
      <SuperAdminNav 
        isSuperAdmin={user.isSuperAdmin} 
        isSupport={user.isSupport}
        openSupportCount={openSupportCount}
      />
      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}

