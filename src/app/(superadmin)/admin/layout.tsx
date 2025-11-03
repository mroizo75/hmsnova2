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

  // Tillat både superadmin og support
  if (!user?.isSuperAdmin && !user?.isSupport) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <SuperAdminNav 
        isSuperAdmin={user.isSuperAdmin} 
        isSupport={user.isSupport}
      />
      <main className="flex-1 p-8 bg-muted/30">
        {children}
      </main>
    </div>
  );
}

