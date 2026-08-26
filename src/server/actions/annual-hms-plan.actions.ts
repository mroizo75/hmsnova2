"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ANNUAL_HMS_PLAN_STEPS, type AnnualHmsPlanStep } from "@/lib/annual-hms-plan-steps";
import { triggerRealtimeEvent } from "@/lib/pusher-server";

const setCompletedSchema = z.object({
  tenantId: z.string(),
  year: z.number().int().min(2020).max(2030),
  stepKey: z.string().min(1),
  completed: z.boolean(),
  userId: z.string().optional(),
  note: z.string().max(2000).optional(),
});

export type AnnualPlanStepWithCompletion = AnnualHmsPlanStep & {
  completedAt: Date | null;
  completedByUserId: string | null;
  note: string | null;
};

export type AnnualPlanChecklistData = {
  year: number;
  steps: AnnualPlanStepWithCompletion[];
  byCategory: Map<AnnualHmsPlanStep["category"], AnnualPlanStepWithCompletion[]>;
  completedCount: number;
  totalCount: number;
};

/** Serialisert form for bruk i client components (Date blir string). */
export type AnnualPlanChecklistDataSerialized = {
  year: number;
  steps: (AnnualPlanStepWithCompletion & { completedAt: Date | string | null })[];
  completedCount: number;
  totalCount: number;
};

export async function serializeAnnualPlanData(
  data: AnnualPlanChecklistData
): Promise<AnnualPlanChecklistDataSerialized> {
  return {
    year: data.year,
    steps: data.steps,
    completedCount: data.completedCount,
    totalCount: data.totalCount,
  };
}

const VALID_STEP_KEYS = new Set(ANNUAL_HMS_PLAN_STEPS.map((s) => s.key));

/**
 * Hent sjekkliste for årlig HMS-plan for en tenant og et gitt år.
 * Returnerer alle steg med eventuell avkryssing (completedAt, completedBy, note).
 */
export async function getAnnualPlanChecklist(
  tenantId: string,
  year: number
): Promise<{ success: true; data: AnnualPlanChecklistData } | { success: false; error: string }> {
  try {
    const completions = await prisma.hmsAnnualPlanCompletion.findMany({
      where: { tenantId, year },
    });
    const completionByKey = new Map(
      completions.map((c) => [
        c.stepKey,
        {
          completedAt: c.completedAt,
          completedByUserId: c.completedByUserId,
          note: c.note,
        },
      ])
    );

    const steps: AnnualPlanStepWithCompletion[] = ANNUAL_HMS_PLAN_STEPS.map((step) => {
      const c = completionByKey.get(step.key);
      return {
        ...step,
        completedAt: c?.completedAt ?? null,
        completedByUserId: c?.completedByUserId ?? null,
        note: c?.note ?? null,
      };
    });

    const byCategory = new Map<AnnualHmsPlanStep["category"], AnnualPlanStepWithCompletion[]>();
    for (const step of steps) {
      const list = byCategory.get(step.category) ?? [];
      list.push(step);
      byCategory.set(step.category, list);
    }

    const completedCount = steps.filter((s) => s.completedAt !== null).length;
    const totalCount = steps.length;

    return {
      success: true,
      data: {
        year,
        steps,
        byCategory,
        completedCount,
        totalCount,
      },
    };
  } catch (err) {
    console.error("getAnnualPlanChecklist error:", err);
    return { success: false, error: "Kunne ikke hente sjekkliste" };
  }
}

/**
 * Sett ett steg som fullført eller fjern avkryssing.
 */
export async function setAnnualPlanStepCompleted(
  input: z.infer<typeof setCompletedSchema>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const parsed = setCompletedSchema.parse(input);
    if (!VALID_STEP_KEYS.has(parsed.stepKey)) {
      return { success: false, error: "Ugyldig steg" };
    }

    if (parsed.completed) {
      await prisma.hmsAnnualPlanCompletion.upsert({
        where: {
          tenantId_year_stepKey: {
            tenantId: parsed.tenantId,
            year: parsed.year,
            stepKey: parsed.stepKey,
          },
        },
        create: {
          tenantId: parsed.tenantId,
          year: parsed.year,
          stepKey: parsed.stepKey,
          completedByUserId: parsed.userId ?? null,
          note: parsed.note ?? null,
        },
        update: {
          completedAt: new Date(),
          completedByUserId: parsed.userId ?? null,
          note: parsed.note ?? null,
        },
      });
    } else {
      await prisma.hmsAnnualPlanCompletion.deleteMany({
        where: {
          tenantId: parsed.tenantId,
          year: parsed.year,
          stepKey: parsed.stepKey,
        },
      });
    }

    revalidatePath("/dashboard/annual-hms-plan");
    triggerRealtimeEvent(parsed.tenantId, "goal-updated");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0]?.message ?? "Ugyldig input" };
    }
    console.error("setAnnualPlanStepCompleted error:", err);
    return { success: false, error: "Kunne ikke oppdatere sjekkliste" };
  }
}
