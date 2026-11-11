"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { AuditLog } from "@/lib/audit-log";
import {
  fieldValueAfterCheckpointMove,
  resolveCheckpointFieldId,
  withCheckpointLabel,
  type CheckpointField,
} from "@/features/inspections/lib/move-checkpoint";

function parseOptions(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : null;
  } catch {
    return null;
  }
}

export async function moveInspectionFindingCheckpoint(findingId: string, fieldId: string) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canConductInspections) {
      return { success: false as const, error: "Du kan ikke endre sjekkpunktet" };
    }

    const finding = await prisma.inspectionFinding.findFirst({
      where: { id: findingId, inspection: { tenantId: auth.tenantId } },
      include: {
        linkedIncident: { select: { id: true, title: true, description: true } },
        inspection: {
          select: {
            id: true,
            formSubmissionId: true,
            formTemplate: {
              select: {
                fields: { select: { id: true, label: true, options: true } },
              },
            },
            findings: {
              select: {
                id: true,
                checklistFieldId: true,
                title: true,
                linkedIncident: { select: { description: true } },
              },
            },
          },
        },
      },
    });

    if (!finding) {
      return { success: false as const, error: "Funnet ble ikke funnet" };
    }

    const fields: CheckpointField[] = (finding.inspection.formTemplate?.fields ?? []).map((field) => ({
      id: field.id,
      label: field.label,
      options: parseOptions(field.options),
    }));
    const nextField = fields.find((field) => field.id === fieldId);
    if (!nextField) {
      return { success: false as const, error: "Sjekkpunktet finnes ikke på denne vernerunden" };
    }

    const currentFieldId = resolveCheckpointFieldId({
      storedFieldId: finding.checklistFieldId,
      incidentDescription: finding.linkedIncident?.description,
      fields,
    });
    if (currentFieldId === nextField.id) {
      return { success: true as const };
    }

    const currentField = fields.find((field) => field.id === currentFieldId) ?? null;
    const placed = finding.inspection.findings.map((item) => ({
      id: item.id,
      fieldId: resolveCheckpointFieldId({
        storedFieldId: item.checklistFieldId,
        incidentDescription: item.linkedIncident?.description,
        fields,
      }),
    }));
    const nextPlacement = placed.map((item) =>
      item.id === finding.id ? { ...item, fieldId: nextField.id } : item,
    );

    await prisma.inspectionFinding.update({
      where: { id: finding.id },
      data: {
        checklistFieldId: nextField.id,
        ...(currentField && finding.title === currentField.label ? { title: nextField.label } : {}),
      },
    });

    if (finding.linkedIncident) {
      const nextTitle =
        currentField && finding.linkedIncident.title === `[Vernerunde] ${currentField.label}`
          ? `[Vernerunde] ${nextField.label}`
          : finding.linkedIncident.title;
      await prisma.incident.update({
        where: { id: finding.linkedIncident.id },
        data: {
          title: nextTitle,
          description: withCheckpointLabel(finding.linkedIncident.description, nextField.label),
        },
      });
      revalidatePath(`/dashboard/incidents/${finding.linkedIncident.id}`);
      revalidatePath(`/ansatt/avvik/${finding.linkedIncident.id}`);
    }

    if (finding.inspection.formSubmissionId) {
      const values = await prisma.formFieldValue.findMany({
        where: { submissionId: finding.inspection.formSubmissionId },
        select: { id: true, fieldId: true, value: true },
      });
      const touched = [currentField, nextField].filter(
        (field): field is CheckpointField => field !== null,
      );
      for (const field of touched) {
        const existing = values.find((value) => value.fieldId === field.id);
        const nextValue = fieldValueAfterCheckpointMove({
          fieldId: field.id,
          currentValue: existing?.value ?? null,
          options: field.options,
          findingIdsOnField: nextPlacement
            .filter((item) => item.fieldId === field.id)
            .map((item) => item.id),
        });
        if (nextValue === existing?.value) continue;
        if (existing) {
          await prisma.formFieldValue.update({
            where: { id: existing.id },
            data: { value: nextValue },
          });
        } else if (nextValue) {
          await prisma.formFieldValue.create({
            data: {
              submissionId: finding.inspection.formSubmissionId,
              fieldId: field.id,
              value: nextValue,
            },
          });
        }
      }
    }

    await AuditLog.log(
      auth.tenantId,
      auth.userId,
      "INSPECTION_CHECKPOINT_MOVED",
      "InspectionFinding",
      finding.id,
      {
        inspectionId: finding.inspection.id,
        fromFieldId: currentField?.id ?? null,
        fromLabel: currentField?.label ?? null,
        toFieldId: nextField.id,
        toLabel: nextField.label,
        incidentId: finding.linkedIncident?.id ?? null,
      },
    );

    revalidatePath(`/dashboard/inspections/${finding.inspection.id}`);
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke flytte sjekkpunktet";
    return { success: false as const, error: message };
  }
}
