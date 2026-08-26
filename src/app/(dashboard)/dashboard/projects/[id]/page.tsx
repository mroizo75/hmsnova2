import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building2, MapPin, User, CalendarDays,
  Edit, FileText,
} from "lucide-react";
import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchProjectDetail } from "@/server/queries/project.queries";
import { ProjectDetailContent } from "@/features/projects/components/project-detail-content";

function getStatusConfig(
  t: Awaited<ReturnType<typeof getTranslations>>
): Record<ProjectStatus, { label: string; color: string }> {
  return {
    PLANNING: { label: t("status.planning"), color: "bg-blue-100 text-blue-800 border-blue-300" },
    ACTIVE: { label: t("status.active"), color: "bg-green-100 text-green-800 border-green-300" },
    ON_HOLD: { label: t("status.onHold"), color: "bg-amber-100 text-amber-800 border-amber-300" },
    COMPLETED: { label: t("status.completed"), color: "bg-gray-100 text-gray-700 border-gray-300" },
    ARCHIVED: { label: t("status.archived"), color: "bg-gray-100 text-gray-500 border-gray-200" },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("dashboardProjectDetailPage");
  const locale = await getLocale();
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
  if (!selectedMembership) return <div>{t("noAccess")}</div>;

  const { id } = await params;

  const initialData = await fetchProjectDetail(id);
  if (!initialData) notFound();

  const { project } = initialData;
  const sc = getStatusConfig(t)[project.status as ProjectStatus];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={`border ${sc.color}`}>{sc.label}</Badge>
              {project.code && (
                <span className="font-mono text-sm text-muted-foreground">{project.code}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
              {project.clientName && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {project.clientName}
                </span>
              )}
              {project.orderNumber && (
                <span className="font-mono text-xs">{t("orderNumber", { number: project.orderNumber })}</span>
              )}
              {project.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.location}
                </span>
              )}
              {project.projectManager && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {project.projectManager.name || project.projectManager.email}
                </span>
              )}
              {(project.startDate || project.endDate) && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {project.startDate
                    ? new Date(project.startDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")
                    : "—"}
                  {" → "}
                  {project.endDate
                    ? new Date(project.endDate).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")
                    : t("ongoing")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/projects/${project.id}/edit`}>
              <Edit className="mr-1 h-3.5 w-3.5" />
              {t("actions.edit")}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <a href={`/api/projects/${project.id}/report`} target="_blank">
              <FileText className="mr-1 h-3.5 w-3.5" />
              {t("actions.pdfReport")}
            </a>
          </Button>
        </div>
      </div>

      <ProjectDetailContent initialData={initialData} />
    </div>
  );
}
