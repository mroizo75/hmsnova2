import { RiskCategory } from "@prisma/client";
import { z } from "zod";

export const riskImportRowSchema = z.object({
  title: z.string().trim().min(3).max(500),
  context: z.string().trim().min(3).max(4000),
  description: z.string().trim().max(2000).nullable().default(null),
  riskStatement: z.string().trim().max(500).nullable().default(null),
  likelihood: z.coerce.number().int().min(1).max(5),
  consequence: z.coerce.number().int().min(1).max(5),
  category: z.nativeEnum(RiskCategory).default(RiskCategory.OPERATIONAL),
  existingControls: z.string().trim().max(2000).nullable().default(null),
  measures: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  confidence: z.coerce.number().min(0).max(1).default(0),
  missingFields: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
});

export const riskImportPreviewSchema = z.object({
  title: z.string().trim().min(3).max(200),
  assessmentYear: z.coerce.number().int().min(2000).max(2100),
  participants: z.string().trim().max(2000).nullable().default(null),
  rows: z.array(riskImportRowSchema).min(1).max(200),
});

export const confirmRiskImportSchema = riskImportPreviewSchema.extend({
  fileKey: z.string().min(10).max(1000),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(200),
  ownerId: z.string().cuid(),
});

export type RiskImportPreview = z.infer<typeof riskImportPreviewSchema>;
export type ConfirmRiskImportInput = z.infer<typeof confirmRiskImportSchema>;

export function extractJsonObject(value: string): unknown {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("AI-svaret inneholdt ikke gyldig JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

export function parseRiskImportResponse(value: string): RiskImportPreview {
  return riskImportPreviewSchema.parse(extractJsonObject(value));
}
