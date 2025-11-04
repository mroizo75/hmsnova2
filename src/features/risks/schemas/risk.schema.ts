import { z } from "zod";
import { RiskStatus } from "@prisma/client";

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
});

export const updateRiskSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(3).optional(),
  context: z.string().min(10).optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  consequence: z.number().int().min(1).max(5).optional(),
  ownerId: z.string().cuid().optional(),
  status: z.nativeEnum(RiskStatus).optional(),
});

export type CreateRiskInput = z.infer<typeof createRiskSchema>;
export type UpdateRiskInput = z.infer<typeof updateRiskSchema>;

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

