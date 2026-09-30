import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  SjaTemplateEditor,
  type SjaTemplateEditorData,
} from "@/components/sja/sja-template-editor";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

interface EditSjaTemplatePageProps {
  params: Promise<{ id: string }>;
}

function parseCourseKeys(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default async function EditSjaTemplatePage({ params }: EditSjaTemplatePageProps) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canApproveSja) redirect("/dashboard/sja");
  const { id } = await params;
  const template = await prisma.sjaTemplate.findFirst({
    where: { id, tenantId: auth.tenantId, isActive: true },
    include: { hazards: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) notFound();
  if (template.isLockedByGroup) redirect("/dashboard/sja/maler");

  const initialData: SjaTemplateEditorData = {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    workLocation: template.workLocation ?? "",
    electricalWorkType: template.electricalWorkType,
    workMethod: template.workMethod ?? "",
    requiredEquipment: template.requiredEquipment ?? "",
    requiredPpe: template.requiredPpe ?? "",
    personnelRequirements: template.personnelRequirements ?? "",
    safetyConditions: template.safetyConditions ?? "",
    requiresSecondPerson: template.requiresSecondPerson,
    requiredCourseKeys: parseCourseKeys(template.requiredCourseKeys),
    hazards: template.hazards.map((hazard) => ({
      activity: hazard.activity,
      hazard: hazard.hazard,
      consequence: hazard.consequence ?? "",
      probability: hazard.probability,
      severity: hazard.severity,
      measures: hazard.measures,
      responsibleName: hazard.responsibleName ?? "",
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Pencil className="h-7 w-7 text-amber-600" />
          Rediger SJA-mal
        </h1>
        <p className="text-muted-foreground">
          Endringen gjelder nye SJA-er. Eksisterende analyser beholder sitt historiske snapshot.
        </p>
      </div>
      <SjaTemplateEditor initialData={initialData} />
    </div>
  );
}
