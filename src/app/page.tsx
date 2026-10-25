import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import HomePage, { metadata } from "./(public)/page";

export { metadata };

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <>
        <PublicNav />
        <main className="min-h-[calc(100vh-4rem)]">
          <HomePage />
        </main>
        <PublicFooter />
      </>
    );
  }

  if (session.user.isSuperAdmin || session.user.isSupport) {
    redirect("/admin");
  }

  if (session.user.role === "ANSATT" && !session.user.extraRoles?.includes("LEDER")) {
    const managesProject = session.user.tenantId
      ? await prisma.project.count({
          where: { tenantId: session.user.tenantId, projectManagerId: session.user.id },
        })
      : 0;
    if (managesProject === 0) {
      redirect("/ansatt");
    }
  }

  redirect("/dashboard");
}
