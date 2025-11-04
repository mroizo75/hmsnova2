import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/toaster";
import { SessionUser } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Redirect superadmin og support til admin dashboard
  const user = session.user as SessionUser;
  if (user.isSuperAdmin || user.isSupport) {
    redirect("/admin");
  }

  // VIKTIG: Redirect ANSATT til employee dashboard
  if (user.role === "ANSATT") {
    redirect("/ansatt");
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <MobileNav />
      <DashboardNav />
      <main className="flex-1 p-4 lg:p-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}

