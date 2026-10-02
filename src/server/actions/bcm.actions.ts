"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { logAiFeedback } from "@/lib/ai-feedback";
import { requirePermission } from "@/lib/server-authorization";
import { BCM_FORM_FIELD_LABELS } from "@/features/bcm/lib/bcm-wizard.constants";
import { generateBcmPlanHtml } from "@/features/bcm/lib/bcm-plan-html";
import {
  bcmWizardSubmitSchema,
  type BcmWizardSubmitInput,
} from "@/features/bcm/schemas/bcm-wizard.schema";

async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.tenantId) return null;
  return { email: session.user.email, tenantId: session.user.tenantId, userId: session.user.id };
}

export async function activateBcmTemplate(templateId: string) {
  const ctx = await getSessionContext();
  if (!ctx) return { success: false, error: "Unauthorized" };

  const template = await prisma.documentTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) return { success: false, error: "Mal ikke funnet" };

  const existing = await prisma.document.findFirst({
    where: { tenantId: ctx.tenantId, templateId: template.id },
  });

  if (existing) {
    return { success: false, error: "Du har allerede opprettet et dokument fra denne malen" };
  }

  const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const doc = await prisma.document.create({
    data: {
      title: template.name,
      tenantId: ctx.tenantId,
      templateId: template.id,
      status: "DRAFT",
      kind: "PLAN",
      slug: `${slug}-${Date.now()}`,
      fileKey: "",
      ownerId: ctx.userId!,
      version: "1.0",
      planSummary: template.description ?? "",
    },
  });

  revalidatePath("/dashboard/bcm");
  revalidatePath("/dashboard/documents");
  triggerRealtimeEvent(ctx.tenantId, "document-updated");

  return { success: true, documentId: doc.id };
}

export async function submitBcmWizard(input: BcmWizardSubmitInput) {
  try {
    const ctx = await requirePermission("canCreateIncidents");
    const data = bcmWizardSubmitSchema.parse(input);
    const formTemplate = await prisma.formTemplate.findFirst({
      where: { title: "Beredskapsplan — veiviser", isGlobal: true, category: "BCM" },
      include: { fields: true },
    });

    if (!formTemplate) {
      return { success: false as const, error: "BCM-veivisermal ikke funnet. Kjør seed først." };
    }

    const fieldByLabel = new Map(formTemplate.fields.map((field) => [field.label, field.id]));
    const serializedValues = new Map<string, string>([
      [
        BCM_FORM_FIELD_LABELS.organization,
        JSON.stringify({
          organizationScope: data.organizationScope,
          locationsAndWork: data.locationsAndWork,
        }),
      ],
      [
        BCM_FORM_FIELD_LABELS.legalScreening,
        JSON.stringify({
          worksInBuilding: data.worksInBuilding,
          hasHazardousChemicals: data.hasHazardousChemicals,
          handlesDangerousSubstances: data.handlesDangerousSubstances,
          specialConditions: data.specialConditions,
          specialistAssessment: data.specialistAssessment,
        }),
      ],
      [
        BCM_FORM_FIELD_LABELS.riskBasis,
        JSON.stringify({
          riskAssessmentReference: data.riskAssessmentReference,
          employeeParticipation: data.employeeParticipation,
        }),
      ],
      [BCM_FORM_FIELD_LABELS.criticalProcesses, JSON.stringify(data.criticalProcesses)],
      [BCM_FORM_FIELD_LABELS.crisisTeam, JSON.stringify(data.crisisTeam)],
      [BCM_FORM_FIELD_LABELS.riskScenarios, JSON.stringify(data.riskScenarios)],
      [
        BCM_FORM_FIELD_LABELS.responsePlans,
        JSON.stringify({
          alertingPlan: data.alertingPlan,
          emergencyActions: data.emergencyActions,
          evacuationPlan: data.evacuationPlan,
          chemicalEmergencyPlan: data.chemicalEmergencyPlan,
          dangerousSubstancePlan: data.dangerousSubstancePlan,
        }),
      ],
      [BCM_FORM_FIELD_LABELS.resources, data.firstAidAndResources],
      [BCM_FORM_FIELD_LABELS.recoveryPlan, data.recoveryPlan],
      [BCM_FORM_FIELD_LABELS.communicationPlan, data.communicationPlan],
      [
        BCM_FORM_FIELD_LABELS.trainingAndExercises,
        JSON.stringify({ trainingPlan: data.trainingPlan, exercisePlan: data.exercisePlan }),
      ],
      [BCM_FORM_FIELD_LABELS.confirmations, JSON.stringify(data.confirmations)],
      [BCM_FORM_FIELD_LABELS.nextReview, data.nextReviewDate],
    ]);

    const missingFields = [...serializedValues.keys()].filter((label) => !fieldByLabel.has(label));
    if (missingFields.length > 0) {
      return {
        success: false as const,
        error: `BCM-veivisermalen må oppdateres. Mangler: ${missingFields.join(", ")}`,
      };
    }

    const planTemplate = await prisma.documentTemplate.findFirst({
      where: { name: "Gjenopprettingsplan", isGlobal: true, category: "BCM" },
      select: { id: true },
    });
    const contentHtml = generateBcmPlanHtml(data);
    const result = await prisma.$transaction(async (transaction) => {
      const submission = await transaction.formSubmission.create({
        data: {
          formTemplateId: formTemplate.id,
          tenantId: ctx.tenantId,
          submittedById: ctx.userId,
          status: "SUBMITTED",
        },
      });

      await transaction.formFieldValue.createMany({
        data: [...serializedValues.entries()].map(([label, value]) => ({
          submissionId: submission.id,
          fieldId: fieldByLabel.get(label)!,
          value,
        })),
      });

      const document = await transaction.document.create({
        data: {
          title: `Beredskapsplan — ${new Date().getFullYear()}`,
          tenantId: ctx.tenantId,
          status: "DRAFT",
          kind: "PLAN",
          slug: `beredskapsplan-${Date.now()}`,
          fileKey: "",
          ownerId: ctx.userId,
          version: "1.0",
          planSummary: contentHtml,
          templateId: planTemplate?.id,
          nextReviewDate: new Date(`${data.nextReviewDate}T12:00:00`),
        },
      });

      return { submissionId: submission.id, documentId: document.id };
    });

    if (data.aiSuggestedText && data.aiSuggestedField) {
      void logAiFeedback({
        tenantId: ctx.tenantId,
        feature: "bcm_guidance",
        aiSuggestion: data.aiSuggestedText,
        userFinalValue: data[data.aiSuggestedField],
      });
    }

    revalidatePath("/dashboard/bcm");
    revalidatePath(`/dashboard/bcm/planer/${result.documentId}`);
    triggerRealtimeEvent(ctx.tenantId, "document-updated");

    return { success: true as const, ...result };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette beredskapsplan" };
  }
}
