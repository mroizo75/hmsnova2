import { z } from "zod";

export const mocChangeTypes = [
  "PROCESS",
  "WORKPLACE",
  "ORGANIZATION",
  "CONDITIONS",
  "EQUIPMENT",
  "WORKFORCE",
  "LEGAL",
  "KNOWLEDGE",
  "TECHNOLOGY",
] as const;

export const createMocSchema = z.object({
  title: z.string().trim().min(3, "Tittel må være minst 3 tegn"),
  description: z.string().trim().min(10, "Beskriv endringen"),
  changeType: z.enum(mocChangeTypes),
  duration: z.enum(["TEMPORARY", "PERMANENT"]),
  source: z.enum(["PLANNED", "UNINTENDED"]).default("PLANNED"),
  classification: z.enum(["MINOR", "SIGNIFICANT", "MAJOR"]),
  hseImpact: z.string().trim().min(5, "Beskriv HMS-konsekvens"),
  environmentalImpact: z.string().trim().min(5, "Beskriv konsekvens for ytre miljø (ISO 14001:2026 6.3)"),
  plannedStartAt: z.string().optional(),
  plannedEndAt: z.string().optional(),
  rollbackPlan: z.string().optional(),
  projectId: z.string().optional(),
  incidentId: z.string().optional(),
});

export const updateMocSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(3).optional(),
  description: z.string().trim().min(10).optional(),
  changeType: z.enum(mocChangeTypes).optional(),
  duration: z.enum(["TEMPORARY", "PERMANENT"]).optional(),
  classification: z.enum(["MINOR", "SIGNIFICANT", "MAJOR"]).optional(),
  hseImpact: z.string().optional(),
  environmentalImpact: z.string().optional(),
  impactAssessment: z.string().optional(),
  plannedStartAt: z.string().optional().nullable(),
  plannedEndAt: z.string().optional().nullable(),
  rollbackPlan: z.string().optional().nullable(),
  responsibleId: z.string().optional().nullable(),
});

export const transitionMocSchema = z.object({
  id: z.string(),
  to: z.enum([
    "DRAFT",
    "IMPACT_ASSESSMENT",
    "PENDING_APPROVAL",
    "APPROVED",
    "IMPLEMENTING",
    "VERIFYING",
    "CLOSED",
    "REJECTED",
    "CANCELLED",
  ]),
  rejectedReason: z.string().optional(),
  cancelledReason: z.string().optional(),
  verificationNote: z.string().optional(),
});
