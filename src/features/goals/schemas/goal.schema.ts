import { z } from "zod";

/**
 * ISO 9001 - 6.2 Kvalitetsmål
 * 
 * Organisasjonen skal etablere kvalitetsmål for relevante funksjoner,
 * nivåer og prosesser som trengs for ledelsessystemet for kvalitet.
 * 
 * Kvalitetsmål skal:
 * a) Være konsistent med kvalitetspolitikken
 * b) Være målbare
 * c) Ta hensyn til gjeldende krav
 * d) Være relevante for samsvar med produkter og tjenester
 * e) Bli overvåket
 * f) Bli kommunisert
 * g) Bli oppdatert etter behov
 * 
 * ISO 9001 - 9.1 Overvåking, måling, analyse og evaluering
 * Organisasjonen skal bestemme hva som skal overvåkes og måles,
 * og når resultatene skal analyseres og evalueres.
 */

export const createGoalSchema = z.object({
  tenantId: z.string().cuid(),
  title: z.string().min(5, "Tittel må være minst 5 tegn"),
  description: z.string().optional(),
  category: z.enum([
    "QUALITY",
    "HMS",
    "ENVIRONMENT",
    "CUSTOMER",
    "EFFICIENCY",
    "FINANCE",
    "COMPETENCE",
    "OTHER",
  ]),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  baseline: z.number().optional(),
  year: z.number().int().min(2020).max(2100),
  quarter: z.number().int().min(1).max(4).optional(),
  startDate: z.date().optional(),
  deadline: z.date().optional(),
  ownerId: z.string().cuid(),
  status: z.enum(["ACTIVE", "ACHIEVED", "AT_RISK", "FAILED", "ARCHIVED"]).default("ACTIVE"),
});

export const updateGoalSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(5).optional(),
  description: z.string().optional(),
  category: z
    .enum([
      "QUALITY",
      "HMS",
      "ENVIRONMENT",
      "CUSTOMER",
      "EFFICIENCY",
      "FINANCE",
      "COMPETENCE",
      "OTHER",
    ])
    .optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  baseline: z.number().optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  startDate: z.date().optional().nullable(),
  deadline: z.date().optional().nullable(),
  ownerId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "ACHIEVED", "AT_RISK", "FAILED", "ARCHIVED"]).optional(),
});

export const createMeasurementSchema = z.object({
  goalId: z.string().cuid(),
  value: z.number(),
  measurementDate: z.date(),
  measurementType: z.enum(["MANUAL", "AUTOMATIC", "CALCULATED"]).default("MANUAL"),
  comment: z.string().optional(),
  measuredById: z.string().cuid().optional(),
  source: z.string().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;

/**
 * Get category label (Norwegian)
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    QUALITY: "Kvalitet",
    HMS: "HMS",
    ENVIRONMENT: "Miljø",
    CUSTOMER: "Kunde",
    EFFICIENCY: "Effektivitet",
    FINANCE: "Økonomi",
    COMPETENCE: "Kompetanse",
    OTHER: "Annet",
  };
  return labels[category] || category;
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    QUALITY: "bg-blue-100 text-blue-800 border-blue-300",
    HMS: "bg-teal-100 text-teal-800 border-teal-300",
    ENVIRONMENT: "bg-green-100 text-green-800 border-green-300",
    CUSTOMER: "bg-purple-100 text-purple-800 border-purple-300",
    EFFICIENCY: "bg-orange-100 text-orange-800 border-orange-300",
    FINANCE: "bg-yellow-100 text-black border-yellow-300",
    COMPETENCE: "bg-pink-100 text-pink-800 border-pink-300",
    OTHER: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return colors[category] || "bg-gray-100 text-gray-800 border-gray-300";
}

/**
 * Get status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktivt",
    ACHIEVED: "Oppnådd",
    AT_RISK: "I risiko",
    FAILED: "Ikke oppnådd",
    ARCHIVED: "Arkivert",
  };
  return labels[status] || status;
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-blue-100 text-blue-800 border-blue-300",
    ACHIEVED: "bg-green-100 text-green-800 border-green-300",
    AT_RISK: "bg-yellow-100 text-black border-yellow-300",
    FAILED: "bg-red-100 text-red-800 border-red-300",
    ARCHIVED: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number | null, target: number | null, baseline: number | null = null): number {
  if (target === null || target === 0) return 0;
  if (current === null) return 0;

  // If we have a baseline, calculate progress from baseline to target
  if (baseline !== null) {
    const totalDistance = target - baseline;
    const currentDistance = current - baseline;
    return Math.round((currentDistance / totalDistance) * 100);
  }

  // Otherwise, simple percentage
  return Math.round((current / target) * 100);
}

/**
 * Get progress color
 */
export function getProgressColor(progress: number): string {
  if (progress >= 100) return "bg-green-500";
  if (progress >= 75) return "bg-blue-500";
  if (progress >= 50) return "bg-yellow-500";
  if (progress >= 25) return "bg-orange-500";
  return "bg-red-500";
}

/**
 * Calculate status based on progress and deadline
 */
export function calculateStatus(
  currentValue: number | null,
  targetValue: number | null,
  baseline: number | null,
  deadline: Date | null
): "ACTIVE" | "ACHIEVED" | "AT_RISK" | "FAILED" {
  if (targetValue === null) return "ACTIVE";

  const progress = calculateProgress(currentValue, targetValue, baseline);

  // Achieved
  if (progress >= 100) return "ACHIEVED";

  // Check if deadline has passed
  if (deadline) {
    const now = new Date();
    const daysToDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Deadline passed
    if (daysToDeadline < 0) {
      return progress >= 80 ? "ACHIEVED" : "FAILED";
    }

    // Less than 30 days to deadline and progress < 75%
    if (daysToDeadline < 30 && progress < 75) {
      return "AT_RISK";
    }
  }

  return "ACTIVE";
}

/**
 * Get measurement type label
 */
export function getMeasurementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MANUAL: "Manuell",
    AUTOMATIC: "Automatisk",
    CALCULATED: "Beregnet",
  };
  return labels[type] || type;
}

/**
 * Get measurement type color
 */
export function getMeasurementTypeColor(type: string): string {
  const colors: Record<string, string> = {
    MANUAL: "bg-blue-100 text-blue-800 border-blue-300",
    AUTOMATIC: "bg-green-100 text-green-800 border-green-300",
    CALCULATED: "bg-purple-100 text-purple-800 border-purple-300",
  };
  return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
}

