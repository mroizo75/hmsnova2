import { z } from "zod";
import { SjaStatus, SjaConclusion } from "@prisma/client";
import {
  electricalWorkTypes,
  getMissingChecklistItems,
  requiresSecondPersonByFse,
} from "@/features/sja/lib/sja-fse";

export const sjaHazardSchema = z.object({
  activity: z.string().min(1, "Aktivitet er påkrevd"),
  hazard: z.string().min(1, "Fare/risiko er påkrevd"),
  consequence: z.string().optional(),
  probability: z.number().min(1).max(5).default(1),
  severity: z.number().min(1).max(5).default(1),
  measures: z.string().min(1, "Tiltak er påkrevd"),
  responsibleName: z.string().optional(),
  sortOrder: z.number().default(0),
  linkedRiskId: z.string().cuid().optional().nullable(),
});

export const sjaParticipantSchema = z.object({
  userId: z.string().cuid().optional(),
  name: z.string().min(1, "Navn på deltaker er påkrevd"),
  isExternal: z.boolean().default(false),
  competenceConfirmed: z.boolean().default(false),
});

const fseChecklistSchema = z.record(z.string(), z.boolean()).default({});
const aiVerificationSchema = z.object({
  actualWorksiteConfirmed: z.boolean(),
  workerParticipationConfirmed: z.boolean(),
  barriersConfirmed: z.boolean(),
  stopCriteriaConfirmed: z.boolean(),
  specialRequirementsConfirmed: z.boolean(),
});

export const createSjaSchema = z.object({
  tenantId: z.string().cuid(),
  projectId: z.string().cuid().optional(),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  description: z.string().optional(),
  workLocation: z.string().min(1, "Arbeidssted er påkrevd"),
  plannedDate: z.date(),
  responsibleName: z.string().min(1, "Ansvarlig er påkrevd"),
  participants: z.string().min(1, "Deltakere er påkrevd – alle involverte må registreres"),
  additionalConditions: z.string().optional(),
  weatherConditions: z.string().optional(),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  electricalWorkType: z.enum(electricalWorkTypes).default("NOT_APPLICABLE"),
  workMethod: z.string().optional(),
  requiredEquipment: z.string().optional(),
  requiredPpe: z.string().optional(),
  personnelRequirements: z.string().optional(),
  safetyConditions: z.string().optional(),
  fseChecklist: fseChecklistSchema,
  requiresSecondPerson: z.boolean().default(false),
  secondPersonException: z.string().optional(),
  participantRecords: z.array(sjaParticipantSchema).default([]),
  aiGenerated: z.boolean().default(false),
  aiVerification: aiVerificationSchema.optional(),
  hazards: z.array(sjaHazardSchema).min(1, "Minst én fare må identifiseres"),
}).superRefine((data, ctx) => {
  if (data.aiGenerated) {
    const verification = data.aiVerification;
    const requiredConfirmations = [
      ["actualWorksiteConfirmed", verification?.actualWorksiteConfirmed],
      ["workerParticipationConfirmed", verification?.workerParticipationConfirmed],
      ["barriersConfirmed", verification?.barriersConfirmed],
      ["stopCriteriaConfirmed", verification?.stopCriteriaConfirmed],
      ["specialRequirementsConfirmed", verification?.specialRequirementsConfirmed],
    ] as const;
    for (const [key, confirmed] of requiredConfirmations) {
      if (confirmed !== true) {
        ctx.addIssue({
          code: "custom",
          path: ["aiVerification", key],
          message: "AI-utkastet må kontrolleres av ansvarlig bruker før innsending",
        });
      }
    }
  }

  if (data.electricalWorkType !== "NOT_APPLICABLE" && data.participantRecords.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["participantRecords"],
      message: "Elektroarbeid krever at deltakerne velges for kompetansekontroll",
    });
  }
  if (data.electricalWorkType !== "NOT_APPLICABLE") {
    const requiredTextFields = [
      ["workMethod", data.workMethod],
      ["requiredEquipment", data.requiredEquipment],
      ["requiredPpe", data.requiredPpe],
      ["personnelRequirements", data.personnelRequirements],
    ] as const;
    for (const [field, value] of requiredTextFields) {
      if (!value?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Feltet er påkrevd for elektroarbeid etter FSE § 10",
        });
      }
    }
  }

  const missingChecklistItems = getMissingChecklistItems(data.electricalWorkType, data.fseChecklist);
  if (missingChecklistItems.length > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["fseChecklist"],
      message: "Alle relevante FSE-punkter må bekreftes før innsending",
    });
  }

  const secondPersonRequired =
    data.requiresSecondPerson || requiresSecondPersonByFse(data.electricalWorkType);
  const internalParticipants = data.participantRecords.filter(
    (participant) => !participant.isExternal && participant.userId,
  );
  const internalNames = new Set(
    internalParticipants.map((participant) =>
      participant.name.trim().toLocaleLowerCase("nb-NO"),
    ),
  );
  const uniqueExternalNames = new Set(
    data.participantRecords
      .filter((participant) => participant.isExternal)
      .map((participant) => participant.name.trim().toLocaleLowerCase("nb-NO"))
      .filter((name) => !internalNames.has(name)),
  );
  const externalNames = data.participantRecords
    .filter((participant) => participant.isExternal)
    .map((participant) => participant.name.trim().toLocaleLowerCase("nb-NO"));
  if (
    new Set(externalNames).size !== externalNames.length ||
    externalNames.some((name) => internalNames.has(name))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["participantRecords"],
      message: "Samme person kan ikke registreres flere ganger",
    });
  }
  const uniqueParticipantCount =
    new Set(internalParticipants.map((participant) => participant.userId)).size +
    uniqueExternalNames.size;
  if (
    secondPersonRequired &&
    uniqueParticipantCount < 2 &&
    !data.secondPersonException?.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["participantRecords"],
      message: "Arbeidet krever person nummer to eller en dokumentert risikovurdert begrunnelse",
    });
  }
});

export const updateSjaSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  workLocation: z.string().min(1).optional(),
  plannedDate: z.date().optional(),
  responsibleName: z.string().min(1).optional(),
  participants: z.string().optional(),
  status: z.nativeEnum(SjaStatus).optional(),
  conclusion: z.nativeEnum(SjaConclusion).optional(),
  conclusionComment: z.string().optional(),
  hazards: z.array(sjaHazardSchema).optional(),
});

export const createSjaTemplateSchema = z.object({
  tenantId: z.string().cuid(),
  name: z.string().min(3, "Malnavn må være minst 3 tegn"),
  description: z.string().optional(),
  workLocation: z.string().optional(),
  electricalWorkType: z.enum(electricalWorkTypes).default("NOT_APPLICABLE"),
  workMethod: z.string().optional(),
  requiredEquipment: z.string().optional(),
  requiredPpe: z.string().optional(),
  personnelRequirements: z.string().optional(),
  safetyConditions: z.string().optional(),
  requiresSecondPerson: z.boolean().default(false),
  requiredCourseKeys: z.array(z.string().min(1)).default([]),
  hazards: z.array(sjaHazardSchema).min(1, "Minst én fare må legges til i malen"),
});

export const updateSjaTemplateSchema = createSjaTemplateSchema.extend({
  id: z.string().cuid(),
});

export type CreateSjaInput = z.infer<typeof createSjaSchema>;
export type UpdateSjaInput = z.infer<typeof updateSjaSchema>;
export type SjaHazardInput = z.infer<typeof sjaHazardSchema>;
export type SjaParticipantInput = z.infer<typeof sjaParticipantSchema>;
export type CreateSjaTemplateInput = z.infer<typeof createSjaTemplateSchema>;
export type UpdateSjaTemplateInput = z.infer<typeof updateSjaTemplateSchema>;

export function getSjaStatusLabel(status: SjaStatus): string {
  const labels: Record<SjaStatus, string> = {
    DRAFT: "Utkast",
    ACTIVE: "Aktiv",
    COMPLETED: "Fullført",
    CANCELLED: "Kansellert",
  };
  return labels[status];
}

export function getSjaStatusColor(status: SjaStatus): string {
  const colors: Record<SjaStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-800 border-gray-300",
    ACTIVE: "bg-green-100 text-green-800 border-green-300",
    COMPLETED: "bg-blue-100 text-blue-800 border-blue-300",
    CANCELLED: "bg-red-100 text-red-800 border-red-300",
  };
  return colors[status];
}

export function getSjaConclusionLabel(conclusion: SjaConclusion): string {
  const labels: Record<SjaConclusion, string> = {
    NOT_DECIDED: "Ikke avgjort",
    APPROVED: "Godkjent – arbeid kan starte",
    CONDITIONAL: "Betinget godkjent",
    REJECTED: "Avvist – arbeid kan IKKE starte",
  };
  return labels[conclusion];
}

export function getSjaConclusionColor(conclusion: SjaConclusion): string {
  const colors: Record<SjaConclusion, string> = {
    NOT_DECIDED: "bg-gray-100 text-gray-800 border-gray-300",
    APPROVED: "bg-green-100 text-green-800 border-green-300",
    CONDITIONAL: "bg-yellow-100 text-yellow-800 border-yellow-300",
    REJECTED: "bg-red-100 text-red-800 border-red-300",
  };
  return colors[conclusion];
}

export function getRiskColor(riskLevel: number): string {
  if (riskLevel >= 15) return "bg-red-600 text-white";
  if (riskLevel >= 10) return "bg-orange-500 text-white";
  if (riskLevel >= 5) return "bg-yellow-400 text-yellow-900";
  return "bg-green-500 text-white";
}

export function getRiskLabel(riskLevel: number): string {
  if (riskLevel >= 15) return "Svært høy";
  if (riskLevel >= 10) return "Høy";
  if (riskLevel >= 5) return "Middels";
  return "Lav";
}
