import {
  normalizeInspectionFinding,
  type InspectionFindingDraft,
} from "@/lib/inspection-findings";

export type InspectionFormDraftState = {
  submissionId: string;
  values: Record<string, string>;
  comments: Record<string, string>;
  signature: string;
  findings: Record<string, InspectionFindingDraft[]>;
};

export function parseInspectionFormDraft(
  submission:
    | {
        id: string;
        status: string;
        metadata: string | null;
        fieldValues: Array<{ fieldId: string; value: string | null }>;
      }
    | null
    | undefined,
): InspectionFormDraftState | null {
  if (!submission || submission.status !== "DRAFT") return null;

  const comments: Record<string, string> = {};
  let signature = "";
  const findings: Record<string, InspectionFindingDraft[]> = {};

  if (submission.metadata) {
    try {
      const meta = JSON.parse(submission.metadata) as Record<string, unknown>;
      if (meta.fieldComments && typeof meta.fieldComments === "object") {
        for (const [fieldId, value] of Object.entries(meta.fieldComments as Record<string, unknown>)) {
          if (typeof value === "string" && value.trim()) comments[fieldId] = value;
        }
      }
      if (typeof meta.signatureData === "string") signature = meta.signatureData;
      if (Array.isArray(meta.inspectionFindings)) {
        for (const item of meta.inspectionFindings) {
          if (!item || typeof item !== "object") continue;
          const fieldId =
            typeof (item as { fieldId?: unknown }).fieldId === "string"
              ? (item as { fieldId: string }).fieldId
              : "";
          if (!fieldId) continue;
          const label =
            typeof (item as { fieldLabel?: unknown }).fieldLabel === "string"
              ? (item as { fieldLabel: string }).fieldLabel
              : "";
          const draft = normalizeInspectionFinding(item, label);
          if (!draft) continue;
          findings[fieldId] = [...(findings[fieldId] ?? []), draft];
        }
      }
    } catch {
      // Ugyldig metadata ignoreres. Feltverdiene brukes fortsatt.
    }
  }

  const values: Record<string, string> = {};
  for (const field of submission.fieldValues) {
    if (field.value) values[field.fieldId] = field.value;
  }

  return { submissionId: submission.id, values, comments, signature, findings };
}
