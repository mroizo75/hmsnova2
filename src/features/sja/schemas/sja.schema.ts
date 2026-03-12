import { z } from "zod";
import { SjaStatus, SjaConclusion } from "@prisma/client";

export const sjaHazardSchema = z.object({
  activity: z.string().min(1, "Aktivitet er påkrevd"),
  hazard: z.string().min(1, "Fare/risiko er påkrevd"),
  consequence: z.string().optional(),
  probability: z.number().min(1).max(5).default(1),
  severity: z.number().min(1).max(5).default(1),
  measures: z.string().min(1, "Tiltak er påkrevd"),
  responsibleName: z.string().optional(),
  sortOrder: z.number().default(0),
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
  hazards: z.array(sjaHazardSchema).min(1, "Minst én fare må identifiseres"),
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
  hazards: z.array(sjaHazardSchema).min(1, "Minst én fare må legges til i malen"),
});

export type CreateSjaInput = z.infer<typeof createSjaSchema>;
export type UpdateSjaInput = z.infer<typeof updateSjaSchema>;
export type SjaHazardInput = z.infer<typeof sjaHazardSchema>;
export type CreateSjaTemplateInput = z.infer<typeof createSjaTemplateSchema>;

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
