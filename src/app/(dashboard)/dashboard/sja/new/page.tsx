import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, BookTemplate, FolderOpen } from "lucide-react";
import { SjaForm } from "@/components/sja/sja-form";

interface PageProps {
  searchParams: Promise<{ mal?: string; projectId?: string }>;
}

export default async function NewSjaPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { mal: templateId, projectId } = await searchParams;

  const [project, projects, template] = await Promise.all([
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

  const successRedirectPath = safeProjectId
    ? `/dashboard/projects/${safeProjectId}`
    : "/dashboard/sja";

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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>SJA-skjema</CardTitle>
        </CardHeader>
        <CardContent>
          <SjaForm
            tenantId={session.user.tenantId}
            userName={session.user.name || session.user.email || "Bruker"}
            projectId={safeProjectId}
            projects={projects}
            successRedirectPath={successRedirectPath}
            initialData={templateData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
