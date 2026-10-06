import { prisma } from "@/lib/db";
import { parseInspectionFormDraft, type InspectionFormDraftState } from "./inspection-form-draft";

export async function loadInspectionFormDraft(
  inspectionId: string,
  tenantId: string,
  formTemplateId: string,
): Promise<InspectionFormDraftState | null> {
  const inspection = await prisma.inspection.findFirst({
    where: { id: inspectionId, tenantId },
    select: { formSubmissionId: true },
  });

  if (inspection?.formSubmissionId) {
    const linked = await prisma.formSubmission.findFirst({
      where: {
        id: inspection.formSubmissionId,
        tenantId,
        formTemplateId,
        status: "DRAFT",
      },
      include: { fieldValues: true },
    });
    const parsed = parseInspectionFormDraft(linked);
    if (parsed) return parsed;
  }

  const loose = await prisma.formSubmission.findFirst({
    where: {
      tenantId,
      formTemplateId,
      status: "DRAFT",
      metadata: { contains: `"inspectionId":"${inspectionId}"` },
    },
    orderBy: { updatedAt: "desc" },
    include: { fieldValues: true },
  });

  return parseInspectionFormDraft(loose);
}
