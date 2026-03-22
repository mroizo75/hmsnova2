import { z } from "zod";
import {
  ControlFrequency,
  RiskCategory,
  RiskResponseStrategy,
  RiskStatus,
  RiskTrend,
} from "@prisma/client";

/**
 * Schema for creating a new risk assessment
 * Likelihood (1-5) x Consequence (1-5) = Risk Score (1-25)
 */
export const createRiskSchema = z.object({
  tenantId: z.string().cuid(),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  context: z.string().min(10, "Beskrivelse må være minst 10 tegn"),
  likelihood: z.number().int().min(1).max(5),
  consequence: z.number().int().min(1).max(5),
  ownerId: z.string().cuid(),
  status: z.nativeEnum(RiskStatus).default("OPEN"),
  category: z.nativeEnum(RiskCategory).default("OPERATIONAL"),
  location: z.string().max(120).optional().nullable(),
  area: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  existingControls: z.string().max(2000).optional().nullable(),
  controlFrequency: z.nativeEnum(ControlFrequency).default("ANNUAL"),
  riskStatement: z.string().max(500).optional().nullable(),
  residualLikelihood: z.number().int().min(1).max(5).optional().nullable(),
  residualConsequence: z.number().int().min(1).max(5).optional().nullable(),
  nextReviewDate: z.date().optional().nullable(),
  kpiId: z.string().cuid().optional().nullable(),
  inspectionTemplateId: z.string().cuid().optional().nullable(),
  linkedProcess: z.string().max(200).optional().nullable(),
  riskAppetite: z.string().max(500).optional().nullable(),
  riskTolerance: z.string().max(500).optional().nullable(),
  responseStrategy: z.nativeEnum(RiskResponseStrategy).default("REDUCE"),
  trend: z.nativeEnum(RiskTrend).default("STABLE"),
  reviewedAt: z.date().optional().nullable(),
  riskAssessmentId: z.string().cuid().optional().nullable(),
  assessmentDate: z.date().optional().nullable(),
});

export const updateRiskSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).optional(),
  context: z.string().min(10).optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  consequence: z.number().int().min(1).max(5).optional(),
  ownerId: z.string().cuid().optional(),
  status: z.nativeEnum(RiskStatus).optional(),
  category: z.nativeEnum(RiskCategory).optional(),
  location: z.string().max(120).optional().nullable(),
  area: z.string().max(120).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  existingControls: z.string().max(2000).optional().nullable(),
  controlFrequency: z.nativeEnum(ControlFrequency).optional(),
  riskStatement: z.string().max(500).optional().nullable(),
  residualLikelihood: z.number().int().min(1).max(5).optional().nullable(),
  residualConsequence: z.number().int().min(1).max(5).optional().nullable(),
  nextReviewDate: z.date().optional().nullable(),
  kpiId: z.string().cuid().optional().nullable(),
  inspectionTemplateId: z.string().cuid().optional().nullable(),
  linkedProcess: z.string().max(200).optional().nullable(),
  riskAppetite: z.string().max(500).optional().nullable(),
  riskTolerance: z.string().max(500).optional().nullable(),
  responseStrategy: z.nativeEnum(RiskResponseStrategy).optional(),
  trend: z.nativeEnum(RiskTrend).optional(),
  reviewedAt: z.date().optional().nullable(),
  riskAssessmentId: z.string().cuid().optional().nullable(),
  assessmentDate: z.date().optional().nullable(),
});

/** Schema for å opprette en risikovurdering (f.eks. for et år) */
export const createRiskAssessmentSchema = z.object({
  tenantId: z.string().cuid(),
  projectId: z.string().cuid().optional().nullable(),
  title: z.string().min(3, "Tittel må være minst 3 tegn"),
  assessmentYear: z.number().int().min(2000).max(2100),
  // IK-HMS § 5 nr. 3 + AML § 3-1 (1): Hvem deltok (arbeidstakere, verneombud)
  participants: z.string().optional(),
});

// IK-HMS § 5 nr. 6 (godkjenning) + IK-HMS § 5 nr. 8 (periodisk gjennomgang)
export const updateRiskAssessmentSchema = z.object({
  id: z.string().cuid(),
  title: z.string().trim().min(3, "Tittel må være minst 3 tegn").max(200).optional(),
  participants: z.string().optional(),
  approvedById: z.string().cuid().optional().nullable(),
  approvedAt: z.coerce.date().optional().nullable(),
  reviewedById: z.string().cuid().optional().nullable(),
  reviewedAt: z.coerce.date().optional().nullable(),
});

/** Enkel nivå for risikopunkt i årlig risikovurdering (ISO 45001) */
export const riskLevelToMatrix = {
  LOW: { likelihood: 1, consequence: 2 },      // score 2 – Lav
  MEDIUM: { likelihood: 2, consequence: 4 },  // score 8 – Moderat
  HIGH: { likelihood: 4, consequence: 4 },     // score 16 – Høy
  CRITICAL: { likelihood: 5, consequence: 5 }, // score 25 – Kritisk
} as const;

export type CreateRiskInput = z.infer<typeof createRiskSchema>;
export type UpdateRiskInput = z.infer<typeof updateRiskSchema>;
export type CreateRiskAssessmentInput = z.infer<typeof createRiskAssessmentSchema>;
export type UpdateRiskAssessmentInput = z.infer<typeof updateRiskAssessmentSchema>;

/**
 * Helper function to calculate risk score and level
 */
export function calculateRiskScore(likelihood: number, consequence: number) {
  const score = likelihood * consequence;
  
  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  let color: string;
  let bgColor: string;
  let textColor: string; // For badge text
  
  if (score >= 20) {
    level = "CRITICAL";
    color = "text-red-900";
    bgColor = "bg-red-100 border-red-300";
    textColor = "text-red-900";
  } else if (score >= 12) {
    level = "HIGH";
    color = "text-orange-900";
    bgColor = "bg-orange-100 border-orange-300";
    textColor = "text-orange-900";
  } else if (score >= 6) {
    level = "MEDIUM";
    color = "text-yellow-900";
    bgColor = "bg-yellow-100 border-yellow-300";
    textColor = "text-yellow-900";
  } else {
    level = "LOW";
    color = "text-green-900";
    bgColor = "bg-green-100 border-green-300";
    textColor = "text-green-900";
  }
  
  return { score, level, color, bgColor, textColor };
}

/**
 * Get color for risk matrix cell
 */
export function getMatrixCellColor(score: number): string {
  if (score >= 20) return "bg-red-500 hover:bg-red-600";
  if (score >= 12) return "bg-orange-500 hover:bg-orange-600";
  if (score >= 6) return "bg-yellow-500 hover:bg-yellow-600";
  return "bg-green-500 hover:bg-green-600";
}

