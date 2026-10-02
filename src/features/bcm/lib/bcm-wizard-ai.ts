import { z } from "zod";

import {
  BCM_PROCESS_OPTIONS,
  BCM_RISK_OPTIONS,
  BCM_SPECIAL_CONDITION_OPTIONS,
  type BcmProcessOption,
  type BcmRiskOption,
} from "@/features/bcm/lib/bcm-wizard.constants";

export type BcmAiGuidanceStep = "processes" | "roles" | "risks" | "response" | "training" | "quality";

export const bcmAiGuidanceInputSchema = z.object({
  step: z.enum(["processes", "roles", "risks", "response", "training", "quality"]),
  organizationScope: z.string().trim().min(5).max(1_000),
  locationsAndWork: z.string().trim().max(1_000).default(""),
  legalModules: z.array(z.string().trim().max(200)).max(8).default([]),
  criticalProcesses: z.array(z.enum(BCM_PROCESS_OPTIONS)).max(BCM_PROCESS_OPTIONS.length).default([]),
  riskScenarios: z.array(z.enum(BCM_RISK_OPTIONS)).max(BCM_RISK_OPTIONS.length).default([]),
  specialConditions: z
    .array(z.enum(BCM_SPECIAL_CONDITION_OPTIONS.map((option) => option.value)))
    .max(BCM_SPECIAL_CONDITION_OPTIONS.length)
    .default([]),
  currentText: z.string().trim().max(8_000).default(""),
});

export interface BcmAiGuidance {
  suggestedProcesses: BcmProcessOption[];
  suggestedRisks: BcmRiskOption[];
  suggestedRoles: string[];
  suggestedText: string;
  warnings: string[];
  rationale: string;
}

function normalizeStringList(value: unknown, maxItems: number, maxLength = 200): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim().slice(0, maxLength))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

export function normalizeBcmAiGuidance(value: unknown): BcmAiGuidance {
  const parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const processSet = new Set<string>(BCM_PROCESS_OPTIONS);
  const riskSet = new Set<string>(BCM_RISK_OPTIONS);

  return {
    suggestedProcesses: normalizeStringList(parsed.suggestedProcesses, BCM_PROCESS_OPTIONS.length).filter(
      (item): item is BcmProcessOption => processSet.has(item),
    ),
    suggestedRisks: normalizeStringList(parsed.suggestedRisks, BCM_RISK_OPTIONS.length).filter(
      (item): item is BcmRiskOption => riskSet.has(item),
    ),
    suggestedRoles: normalizeStringList(parsed.suggestedRoles, 8, 120),
    suggestedText: String(parsed.suggestedText ?? "").trim().slice(0, 8_000),
    warnings: normalizeStringList(parsed.warnings, 6, 300),
    rationale: String(parsed.rationale ?? "").trim().slice(0, 1_000),
  };
}

export function parseBcmAiJson(response: string): BcmAiGuidance | null {
  const match = response.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return normalizeBcmAiGuidance(JSON.parse(match[0]));
  } catch {
    return null;
  }
}
