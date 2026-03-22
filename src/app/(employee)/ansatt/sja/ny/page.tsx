import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, BookTemplate } from "lucide-react";
import { SjaForm } from "@/components/sja/sja-form";

interface PageProps {
  searchParams: Promise<{ mal?: string; projectId?: string }>;
}

export default async function NySja({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeSjaNewPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { mal: templateId, projectId } = await searchParams;

  const [projects, selectedProject] = await Promise.all([
    prisma.project.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: { in: ["PLANNING", "ACTIVE"] },
      },
      select: {
        id: true,
        name: true,
        location: true,
      },
      orderBy: { name: "asc" },
    }),
    projectId
      ? prisma.project.findFirst({
          where: {
            id: projectId,
            tenantId: session.user.tenantId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve(null),
  ]);

  let templateData: {
    title: string;
    description: string;
    workLocation: string;
    participants: string;
    templateId: string;
    templateName: string;
    hazards: {
      activity: string;
      hazard: string;
      consequence: string;
      probability: number;
      severity: number;
      measures: string;
      responsibleName: string;
    }[];
  } | undefined;

  if (templateId) {
    const template = await prisma.sjaTemplate.findUnique({
      where: { id: templateId, tenantId: session.user.tenantId, isActive: true },
      include: { hazards: { orderBy: { sortOrder: "asc" } } },
    });

    if (template) {
      templateData = {
        title: template.name,
        description: template.description || "",
        workLocation: template.workLocation || "",
        participants: "",
        templateId: template.id,
        templateName: template.name,
        hazards: template.hazards.map((h) => ({
          activity: h.activity,
          hazard: h.hazard,
          consequence: h.consequence || "",
          probability: h.probability,
          severity: h.severity,
          measures: h.measures,
          responsibleName: h.responsibleName || "",
        })),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <HardHat className="h-7 w-7 text-orange-600" />
          {templateData ? t("titleFromTemplate") : t("title")}
        </h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {templateData && (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookTemplate className="h-4 w-4 text-purple-600" />
              <p className="text-sm text-purple-900">
                <strong>{t("template.title", { name: templateData.templateName })}</strong>{" "}
                {t("template.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-l-4 border-l-orange-500 bg-orange-50">
        <CardContent className="p-4">
          <p className="text-sm text-orange-900">
            <strong>{t("important.title")}</strong> {t("important.description")}
          </p>
        </CardContent>
      </Card>

      {selectedProject ? (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900">
              {t("project", { name: selectedProject.name })}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SjaForm
            tenantId={session.user.tenantId}
            userName={session.user.name || session.user.email || t("employeeFallback")}
            projectId={selectedProject?.id}
            projects={projects}
            initialData={templateData}
          />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("howTo.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>{t("howTo.stepsTitle")}</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-muted-foreground ml-2">
              <li>{t("howTo.steps.s1")}</li>
              <li>{t("howTo.steps.s2")}</li>
              <li>{t("howTo.steps.s3")}</li>
              <li>{t("howTo.steps.s4")}</li>
              <li>{t("howTo.steps.s5")}</li>
              <li>{t("howTo.steps.s6")}</li>
            </ol>
          </div>
          <div className="pt-2">
            <strong>{t("howTo.repeatTitle")}</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground ml-2">
              <li>{t("howTo.repeat.r1")}</li>
              <li>{t("howTo.repeat.r2")}</li>
              <li>{t("howTo.repeat.r3")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
