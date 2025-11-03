import { z } from "zod";
import { ActionStatus } from "@prisma/client";

/**
 * ISO 9001 Compliance:
 * - Tiltak må ha ansvarlig person (responsibleId)
 * - Tiltak må ha tidsplan (dueAt)
 * - Tiltak må dokumenteres (description)
 * - Tiltak må følges opp (status tracking)
 * - Tiltak må evalueres (completedAt)
 */

export const createMeasureSchema = z.object({
  tenantId: z.string().cuid(),
  riskId: z.string().cuid().optional(),
  incidentId: z.string().cuid().optional(),
  auditId: z.string().cuid().optional(),
  goalId: z.string().cuid().optional(),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  description: z.string().min(10, "Beskrivelse må være minst 10 tegn").optional(),
  dueAt: z.date(),
  responsibleId: z.string().cuid({ message: "Ansvarlig person må velges" }),
  status: z.nativeEnum(ActionStatus).default("PENDING"),
});

export const updateMeasureSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  dueAt: z.date().optional(),
  responsibleId: z.string().cuid().optional(),
  status: z.nativeEnum(ActionStatus).optional(),
});

export const completeMeasureSchema = z.object({
  id: z.string().cuid(),
  completedAt: z.date(),
  completionNote: z.string().optional(), // Evaluering av tiltaket
});

export type CreateMeasureInput = z.infer<typeof createMeasureSchema>;
export type UpdateMeasureInput = z.infer<typeof updateMeasureSchema>;
export type CompleteMeasureInput = z.infer<typeof completeMeasureSchema>;

/**
 * Helper function to determine if measure is overdue
 */
export function isMeasureOverdue(dueAt: Date, status: ActionStatus): boolean {
  if (status === "DONE") return false;
  return new Date() > new Date(dueAt);
}

/**
 * Get status label
 */
export function getMeasureStatusLabel(status: ActionStatus): string {
  const labels: Record<ActionStatus, string> = {
    PENDING: "Ikke startet",
    IN_PROGRESS: "Pågår",
    DONE: "Fullført",
    OVERDUE: "Forfalt",
  };
  return labels[status];
}

/**
 * Get status color
 */
export function getMeasureStatusColor(status: ActionStatus): string {
  const colors: Record<ActionStatus, string> = {
    PENDING: "bg-gray-100 text-gray-800 border-gray-300",
    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-300",
    DONE: "bg-green-100 text-green-800 border-green-300",
    OVERDUE: "bg-red-100 text-red-800 border-red-300",
  };
  return colors[status];
}

