import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fetchProjects } from "@/server/queries/project.queries";
import { ProjectsListContent } from "@/features/projects/components/projects-list-content";

export default async function ProjectsPage() {
  const t = await getTranslations("dashboardProjectsPage");
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });
  if (!user || user.tenants.length === 0) return <div>{t("noAccess")}</div>;

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("noAccess")}</div>;
  }

  const initialData = await fetchProjects();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-blue-600" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newProject")}
          </Link>
        </Button>
      </div>

      <ProjectsListContent initialData={initialData} />
    </div>
  );
}
