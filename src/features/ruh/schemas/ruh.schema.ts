import { z } from "zod";
import { RuhCategory, RuhStatus } from "@prisma/client";

export const createRuhSchema = z.object({
  tenantId: z.string().cuid(),
  category: z.nativeEnum(RuhCategory),
  title: z.string().min(5, "Tittel må være minst 5 tegn"),
  description: z.string().min(20, "Beskrivelse må være minst 20 tegn"),
  occurredAt: z.date(),
  location: z.string().optional(),
  reportedBy: z.string().min(1, "Rapportert av er påkrevd"),
  reportedById: z.string().cuid().optional(),
  involvedPersons: z.string().optional(),
  witnessName: z.string().optional(),
  injuryOccurred: z.boolean().optional(),
  injuryDescription: z.string().optional(),
  immediateAction: z.string().optional(),
  suggestedActions: z.string().optional(),
});

export const updateRuhSchema = z.object({
  id: z.string().cuid(),
  category: z.nativeEnum(RuhCategory).optional(),
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  occurredAt: z.date().optional(),
  location: z.string().optional(),
  involvedPersons: z.string().optional(),
  witnessName: z.string().optional(),
  injuryOccurred: z.boolean().optional(),
  injuryDescription: z.string().optional(),
  immediateAction: z.string().optional(),
  suggestedActions: z.string().optional(),
  status: z.nativeEnum(RuhStatus).optional(),
  reviewComment: z.string().optional(),
  completedComment: z.string().optional(),
});

export type CreateRuhInput = z.infer<typeof createRuhSchema>;
export type UpdateRuhInput = z.infer<typeof updateRuhSchema>;

export function getRuhCategoryLabel(category: RuhCategory): string {
  const labels: Record<RuhCategory, string> = {
    PERSONSKADE: "Personskade",
    NESTENULYKKE: "Nestenulykke",
    MATERIELL_SKADE: "Materiell skade",
    BRANN_EKSPLOSJON: "Brann / Eksplosjon",
    UTSLIPP_MILJO: "Utslipp / Miljø",
    TRUSLER_VOLD: "Trusler / Vold",
    ERGONOMI: "Ergonomi",
    ANNET: "Annet",
  };
  return labels[category];
}

export function getRuhCategoryColor(category: RuhCategory): string {
  const colors: Record<RuhCategory, string> = {
    PERSONSKADE: "bg-red-100 text-red-800 border-red-300",
    NESTENULYKKE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    MATERIELL_SKADE: "bg-orange-100 text-orange-800 border-orange-300",
    BRANN_EKSPLOSJON: "bg-red-100 text-red-800 border-red-300",
    UTSLIPP_MILJO: "bg-green-100 text-green-800 border-green-300",
    TRUSLER_VOLD: "bg-purple-100 text-purple-800 border-purple-300",
    ERGONOMI: "bg-blue-100 text-blue-800 border-blue-300",
    ANNET: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return colors[category];
}

export function getRuhStatusLabel(status: RuhStatus): string {
  const labels: Record<RuhStatus, string> = {
    SUBMITTED: "Innsendt",
    UNDER_REVIEW: "Under behandling",
    COMPLETED: "Behandlet",
  };
  return labels[status];
}

export function getRuhStatusColor(status: RuhStatus): string {
  const colors: Record<RuhStatus, string> = {
    SUBMITTED: "bg-yellow-100 text-yellow-800 border-yellow-300",
    UNDER_REVIEW: "bg-blue-100 text-blue-800 border-blue-300",
    COMPLETED: "bg-green-100 text-green-800 border-green-300",
  };
  return colors[status];
}
