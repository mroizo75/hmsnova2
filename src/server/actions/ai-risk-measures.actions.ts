"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { AiDisabledError, generateRiskMeasureSuggestions } from "@/lib/ai";
import { logAiFeedback } from "@/lib/ai-feedback";
import { getIndustryLabel, isSupportedIndustry } from "@/lib/industry-packages";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import {
  AI_CONTROL_FREQUENCIES,
  AI_MEASURE_CATEGORIES,
  normalizeAiRiskMeasureDrafts,
  normalizeResidualRisk,
} from "@/lib/risk-measure-ai";
import { requirePermission } from "@/lib/server-authorization";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof AiDisabledError || error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function clip(value: string | null | undefined, max: number): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function industryLabel(industry: string | null): string {
  if (industry && isSupportedIndustry(industry)) return getIndustryLabel(industry);
  return industry?.trim() || "Annet";
}

function parseDueDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("Ugyldig frist");
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) {
    throw new Error("Ugyldig frist");
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    throw new Error("Frist kan ikke være i fortiden");
  }
  return date;
}

const approveSchema = z.object({
  riskId: z.string().cuid(),
  responsibleId: z.string().cuid({ message: "Ansvarlig person må velges" }),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig frist"),
  measures: z
    .array(
      z.object({
        title: z.string().trim().min(3, "Tittel må være minst 3 tegn").max(200),
        description: z.string().trim().min(10, "Beskrivelse må være minst 10 tegn").max(2000),
        category: z.enum(AI_MEASURE_CATEGORIES),
        followUpFrequency: z.enum(AI_CONTROL_FREQUENCIES),
        originalTitle: z.string().max(200).optional(),
      }),
    )
    .min(1, "Velg minst ett tiltak")
    .max(4),
  residualLikelihood: z.number().int().min(1).max(5),
  residualConsequence: z.number().int().min(1).max(5),
  originalResidualLikelihood: z.number().int().min(1).max(5).optional(),
  originalResidualConsequence: z.number().int().min(1).max(5).optional(),
});

/**
 * Henter AI-utkast til tiltak for én risiko. Ingenting lagres.
 * Personopplysninger (navn, e-post) sendes ikke til modellen.
 */
export async function previewAiRiskMeasures(riskId: string) {
  try {
    const { tenantId } = await requirePermission("canCreateActions");
    if (!z.string().cuid().safeParse(riskId).success) {
      return { success: false as const, error: "Ugyldig risiko" };
    }

    const [risk, tenant] = await Promise.all([
      prisma.risk.findFirst({
        where: { id: riskId, tenantId },
        select: {
          id: true,
          title: true,
          context: true,
          description: true,
          riskStatement: true,
          existingControls: true,
          category: true,
          likelihood: true,
          consequence: true,
          location: true,
          area: true,
          measures: { select: { title: true } },
        },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { industry: true },
      }),
    ]);

    if (!risk) {
      return { success: false as const, error: "Risiko ikke funnet" };
    }

    const existingTitles = risk.measures.map((measure) => measure.title);
    const location = [risk.location, risk.area].filter(Boolean).join(", ");
    const context = clip([risk.context, risk.description].filter(Boolean).join(" "), 1500);

    const raw = await generateRiskMeasureSuggestions(
      {
        industry: industryLabel(tenant?.industry ?? null),
        title: clip(risk.title, 200),
        context,
        riskStatement: clip(risk.riskStatement, 800),
        existingControls: clip(risk.existingControls, 800),
        category: risk.category,
        likelihood: risk.likelihood,
        consequence: risk.consequence,
        location: clip(location, 200),
        existingMeasureTitles: existingTitles.slice(0, 20).map((title) => clip(title, 160)),
      },
      {
        cacheScope: `tenant:${tenantId}:riskMeasures:${risk.id}`,
        rateLimitScope: `tenant:${tenantId}`,
        budgetScope: `tenant:${tenantId}`,
        bypassCache: true,
        tenantId,
      },
    );

    const measures = normalizeAiRiskMeasureDrafts(raw, existingTitles);
    if (measures.length === 0) {
      return { success: false as const, error: "AI fant ingen brukbare tiltak for denne risikoen. Prøv igjen." };
    }

    const residual = normalizeResidualRisk(raw, {
      likelihood: risk.likelihood,
      consequence: risk.consequence,
    });

    return {
      success: true as const,
      data: {
        measures,
        existingTitles,
        currentLikelihood: risk.likelihood,
        currentConsequence: risk.consequence,
        residual,
      },
    };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke hente AI-forslag") };
  }
}

/**
 * Lagrer tiltakene brukeren har godkjent. Ansvarlig og frist er påkrevd
 * (ISO 9001:2015 kap. 10.2) og settes av personen, ikke av AI.
 */
export async function approveAiRiskMeasures(input: z.input<typeof approveSchema>) {
  try {
    const { userId, tenantId } = await requirePermission("canCreateActions");
    const validated = approveSchema.parse(input);
    const dueAt = parseDueDate(validated.dueAt);

    const [risk, responsible] = await Promise.all([
      prisma.risk.findFirst({
        where: { id: validated.riskId, tenantId },
        select: { id: true, status: true },
      }),
      prisma.user.findFirst({
        where: { id: validated.responsibleId, tenants: { some: { tenantId } } },
        select: { id: true },
      }),
    ]);

    if (!risk) {
      return { success: false as const, error: "Risiko ikke funnet" };
    }
    if (!responsible) {
      return { success: false as const, error: "Ansvarlig person må tilhøre virksomheten" };
    }

    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const measure of validated.measures) {
        const row = await tx.measure.create({
          data: {
            tenantId,
            riskId: risk.id,
            title: measure.title,
            description: measure.description,
            dueAt,
            responsibleId: responsible.id,
            status: "IN_PROGRESS",
            category: measure.category,
            followUpFrequency: measure.followUpFrequency,
          },
        });
        rows.push(row);
      }

      await tx.risk.update({
        where: { id: risk.id },
        data: {
          ...(risk.status === "OPEN" || risk.status === "ACCEPTED" ? { status: "MITIGATING" as const } : {}),
          residualLikelihood: validated.residualLikelihood,
          residualConsequence: validated.residualConsequence,
          residualScore: validated.residualLikelihood * validated.residualConsequence,
        },
      });

      return rows;
    });

    await prisma.auditLog.createMany({
      data: created.map((measure) => ({
        tenantId,
        userId,
        action: "MEASURE_CREATED",
        resource: `Measure:${measure.id}`,
        metadata: JSON.stringify({
          title: measure.title,
          riskId: risk.id,
          responsibleId: responsible.id,
          source: "ai_approved",
        }),
      })),
    });

    await Promise.all([
      ...validated.measures.map((measure) =>
        logAiFeedback({
          tenantId,
          feature: "risk_measure_suggestion",
          aiSuggestion: measure.originalTitle?.trim() || measure.title,
          userFinalValue: measure.title,
        }),
      ),
      logAiFeedback({
        tenantId,
        feature: "risk_residual_suggestion",
        aiSuggestion: `${validated.originalResidualLikelihood ?? validated.residualLikelihood}×${validated.originalResidualConsequence ?? validated.residualConsequence}`,
        userFinalValue: `${validated.residualLikelihood}×${validated.residualConsequence}`,
      }),
    ]);

    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/${risk.id}`);
    revalidatePath("/dashboard/actions");
    triggerRealtimeEvent(tenantId, "measure-updated", { riskId: risk.id });

    return { success: true as const, data: { created: created.length } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre tiltakene") };
  }
}
