import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, BookTemplate, FolderOpen } from "lucide-react";
import { SjaForm } from "@/components/sja/sja-form";
import { SjaTemplatePicker } from "@/components/sja/sja-template-picker";

interface PageProps {
  searchParams: Promise<{ mal?: string; projectId?: string; utenMal?: string }>;
}

export default async function NewSjaPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { mal: templateId, projectId, utenMal } = await searchParams;

  const [project, projects, template, risks, allTemplates, memberships, training] = await Promise.all([
    projectId
      ? prisma.project.findFirst({
          where: {
            id: projectId,
            tenantId: session.user.tenantId,
          },
          select: {
            id: true,
            name: true,
            location: true,
          },
        })
      : Promise.resolve(null),
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
    templateId
      ? prisma.sjaTemplate.findUnique({
          where: { id: templateId, tenantId: session.user.tenantId, isActive: true },
          include: { hazards: { orderBy: { sortOrder: "asc" } } },
        })
      : Promise.resolve(null),
    prisma.risk.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, title: true, score: true },
      orderBy: { title: "asc" },
    }),
    prisma.sjaTemplate.findMany({
      where: { tenantId: session.user.tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.userTenant.findMany({
      where: { tenantId: session.user.tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { displayName: "asc" },
    }),
    prisma.training.findMany({
      where: {
        tenantId: session.user.tenantId,
        courseKey: {
          in: [
            "elektro-fse-grunnkurs",
            "elektro-forstehjelp",
            "elektro-fse-lavspenning",
            "elektro-lysbue",
          ],
        },
      },
      select: { userId: true, courseKey: true, completedAt: true, validUntil: true },
    }),
  ]);

  const safeProjectId = project?.id;

  const templateData = template
    ? {
        title: template.name,
        description: template.description || "",
        workLocation: project?.location || template.workLocation || "",
        participants: "",
        templateId: template.id,
        templateName: template.name,
        electricalWorkType: template.electricalWorkType,
        workMethod: template.workMethod || "",
        requiredEquipment: template.requiredEquipment || "",
        requiredPpe: template.requiredPpe || "",
        personnelRequirements: template.personnelRequirements || "",
        safetyConditions: template.safetyConditions || "",
        requiresSecondPerson: template.requiresSecondPerson,
        requiredCourseKeys: (() => {
          try {
            const parsed: unknown = JSON.parse(template.requiredCourseKeys || "[]");
            return Array.isArray(parsed)
              ? parsed.filter((value): value is string => typeof value === "string")
              : [];
          } catch {
            return [];
          }
        })(),
        hazards: template.hazards.map((hazard) => ({
          activity: hazard.activity,
          hazard: hazard.hazard,
          consequence: hazard.consequence || "",
          probability: hazard.probability,
          severity: hazard.severity,
          measures: hazard.measures,
          responsibleName: hazard.responsibleName || "",
        })),
      }
    : {
        title: "",
        description: "",
        workLocation: project?.location || "",
        participants: "",
        hazards: [
          {
            activity: "",
            hazard: "",
            consequence: "",
            probability: 1,
            severity: 1,
            measures: "",
            responsibleName: "",
          },
        ],
      };
  const now = new Date();
  const employees = memberships.map((membership) => {
    const records = training.filter((record) => record.userId === membership.userId);
    const annualKeys = new Set(["elektro-fse-grunnkurs", "elektro-forstehjelp"]);
    const validCourseKeys = Array.from(
      new Set(
        records
          .filter((record) => {
            if (!record.completedAt) return false;
            const annualExpiry = new Date(record.completedAt);
            annualExpiry.setFullYear(annualExpiry.getFullYear() + 1);
            if (annualKeys.has(record.courseKey) && annualExpiry < now) return false;
            return !record.validUntil || record.validUntil >= now;
          })
          .map((record) => record.courseKey),
      ),
    );
    return {
      id: membership.userId,
      name: membership.displayName || membership.user.name || membership.user.email,
      validCourseKeys,
      expiredCourseKeys: Array.from(
        new Set(
          records
            .filter(
              (record) =>
                record.completedAt && !validCourseKeys.includes(record.courseKey),
            )
            .map((record) => record.courseKey),
        ),
      ),
    };
  });

  const successRedirectPath = safeProjectId
    ? `/dashboard/projects/${safeProjectId}`
    : "/dashboard/sja";
  const showForm = Boolean(template) || allTemplates.length === 0 || utenMal === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <HardHat className="h-7 w-7 text-orange-600" />
          Ny Sikker Jobb Analyse (SJA)
        </h1>
        <p className="text-muted-foreground">Opprett SJA og koble den direkte til prosjektet.</p>
      </div>

      {safeProjectId ? (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Registreres på prosjekt: <strong>{project?.name}</strong>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {template ? (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50">
          <CardContent className="p-4">
            <p className="text-sm text-purple-900 flex items-center gap-2">
              <BookTemplate className="h-4 w-4" />
              Bruker mal: <strong>{template.name}</strong>
            </p>
          </CardContent>
        </Card>
      ) : allTemplates.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <SjaTemplatePicker templates={allTemplates} selectedTemplateId={templateId} />
          </CardContent>
        </Card>
      ) : null}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>SJA-skjema</CardTitle>
          </CardHeader>
          <CardContent>
            <SjaForm
              tenantId={session.user.tenantId}
              currentUserId={session.user.id}
              userName={session.user.name || session.user.email || "Bruker"}
              projectId={safeProjectId}
              projects={projects}
              risks={risks}
              employees={employees}
              successRedirectPath={successRedirectPath}
              initialData={templateData}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
