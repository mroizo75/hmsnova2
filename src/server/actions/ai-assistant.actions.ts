"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActionContext } from "./action-context";
import { generateAIResponse } from "@/lib/ai";
import { getIndustryLabel } from "@/lib/industry-packages";

const incidentDraftSchema = z.object({
  type: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(10),
  severity: z.number().int().min(1).max(5),
});

const incidentQualitySchema = z.object({
  type: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(10),
  immediateAction: z.string().optional(),
  suggestedActions: z.string().optional(),
  severity: z.number().int().min(1).max(5),
});

const sjaSummarySchema = z.object({
  title: z.string().min(2),
  workLocation: z.string().min(2),
  participants: z.string().min(2),
  hazards: z
    .array(
      z.object({
        activity: z.string().min(1),
        hazard: z.string().min(1),
        consequence: z.string().optional(),
        measures: z.string().min(1),
      })
    )
    .min(1),
});

const inspectionSummarySchema = z.object({
  inspectionName: z.string().min(2),
  checklistItems: z.array(
    z.object({
      title: z.string().min(1),
      status: z.enum(["OK", "NOT_OK", "UNSET"]),
      findingDescription: z.string().optional(),
    })
  ),
});

export async function generateAiIncidentCaseDraft(input: {
  type: string;
  title: string;
  description: string;
  severity: number;
}) {
  try {
    const validated = incidentDraftSchema.parse(input);
    const { tenantId, user } = await getActionContext();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });

    const role = user.tenants[0]?.role || "ANSATT";
    const industry = getIndustryLabel(tenant?.industry || "other");
    const prompt = `Du skal hjelpe en ${role}-bruker i bransjen ${industry} med hendelsesbehandling i norsk HMS-system.
Lag KUN gyldig JSON:
{
  "rootCause":"kort sannsynlig rotarsak",
  "immediateAction":"konkret umiddelbar handling i preteritum",
  "suggestedActions":["konkret tiltak 1","konkret tiltak 2","konkret tiltak 3"],
  "severitySuggestion": 1-5
}

Hendelse:
- Type: ${validated.type}
- Tittel: ${validated.title}
- Beskrivelse: ${validated.description}
- Alvorlighetsgrad nå: ${validated.severity}

Krav:
- Norsk språk.
- Tiltak skal være praktiske og korte.
- SeveritySuggestion skal være realistisk og innen 1-5.`;

    const response = await generateAIResponse(prompt, "gpt-4o-mini", {
      cacheScope: `tenant:${tenantId}:incidentDraft`,
      rateLimitScope: `tenant:${tenantId}`,
      budgetScope: `tenant:${tenantId}`,
    });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) {
      return { success: false, error: "AI returnerte ugyldig format" };
    }
    const parsed = JSON.parse(match[0]) as {
      rootCause?: string;
      immediateAction?: string;
      suggestedActions?: string[];
      severitySuggestion?: number;
    };

    return {
      success: true,
      data: {
        rootCause: (parsed.rootCause || "").trim(),
        immediateAction: (parsed.immediateAction || "").trim(),
        suggestedActions: Array.isArray(parsed.suggestedActions)
          ? parsed.suggestedActions.map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 5)
          : [],
        severitySuggestion:
          typeof parsed.severitySuggestion === "number"
            ? Math.max(1, Math.min(5, Math.round(parsed.severitySuggestion)))
            : validated.severity,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke generere AI-forslag" };
  }
}

export async function runAiIncidentQualityCheck(input: {
  type: string;
  title: string;
  description: string;
  immediateAction?: string;
  suggestedActions?: string;
  severity: number;
}) {
  try {
    const { tenantId } = await getActionContext();
    const validated = incidentQualitySchema.parse(input);
    const prompt = `Kvalitetssjekk denne hendelsesregistreringen i et norsk HMS-system.
Svar KUN med gyldig JSON:
{ "warnings": ["kort forbedringspunkt 1", "kort forbedringspunkt 2"] }

Data:
- Type: ${validated.type}
- Tittel: ${validated.title}
- Beskrivelse: ${validated.description}
- Umiddelbar handling: ${validated.immediateAction || "Mangler"}
- Foreslåtte tiltak: ${validated.suggestedActions || "Mangler"}
- Alvorlighetsgrad: ${validated.severity}

Gi maks 4 konkrete varsler, kun hvis viktig informasjon mangler/er uklar.`;

    const response = await generateAIResponse(prompt, "gpt-4o-mini", {
      cacheScope: `tenant:${tenantId}:incidentQuality`,
      rateLimitScope: `tenant:${tenantId}`,
      budgetScope: `tenant:${tenantId}`,
    });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) {
      return { success: true, data: { warnings: [] as string[] } };
    }
    const parsed = JSON.parse(match[0]) as { warnings?: string[] };
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 4)
      : [];
    return { success: true, data: { warnings } };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke kjøre AI-kvalitetssjekk" };
  }
}

export async function generateAiSjaSummary(input: {
  title: string;
  workLocation: string;
  participants: string;
  hazards: Array<{ activity: string; hazard: string; consequence?: string; measures: string }>;
}) {
  try {
    const { tenantId } = await getActionContext();
    const validated = sjaSummarySchema.parse(input);
    const prompt = `Lag en kort oppsummering av denne SJA-en på norsk.
Svar KUN med gyldig JSON:
{ "summary": "kort oppsummering med hovedfarer, viktigste tiltak og hva som må følges opp" }

Arbeid: ${validated.title}
Sted: ${validated.workLocation}
Deltakere: ${validated.participants}
Farer: ${JSON.stringify(validated.hazards)}`;

    const response = await generateAIResponse(prompt, "gpt-4o-mini", {
      cacheScope: `tenant:${tenantId}:sjaSummary`,
      rateLimitScope: `tenant:${tenantId}`,
      budgetScope: `tenant:${tenantId}`,
    });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return { success: false, error: "AI returnerte ugyldig format" };
    const parsed = JSON.parse(match[0]) as { summary?: string };
    return { success: true, data: { summary: (parsed.summary || "").trim() } };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke generere SJA-oppsummering" };
  }
}

export async function generateAiInspectionSummary(input: {
  inspectionName: string;
  checklistItems: Array<{ title: string; status: "OK" | "NOT_OK" | "UNSET"; findingDescription?: string }>;
}) {
  try {
    const { tenantId } = await getActionContext();
    const validated = inspectionSummarySchema.parse(input);
    const prompt = `Lag en kort norsk oppsummering av vernerunde.
Svar KUN med gyldig JSON:
{ "summary": "kort oppsummering av status, kritiske avvik og anbefalt oppfølging" }

Vernerunde: ${validated.inspectionName}
Punkter: ${JSON.stringify(validated.checklistItems)}`;

    const response = await generateAIResponse(prompt, "gpt-4o-mini", {
      cacheScope: `tenant:${tenantId}:inspectionSummary`,
      rateLimitScope: `tenant:${tenantId}`,
      budgetScope: `tenant:${tenantId}`,
    });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) return { success: false, error: "AI returnerte ugyldig format" };
    const parsed = JSON.parse(match[0]) as { summary?: string };
    return { success: true, data: { summary: (parsed.summary || "").trim() } };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke generere vernerunde-oppsummering" };
  }
}

export async function generateAiDashboardAssistant() {
  try {
    const { tenantId } = await getActionContext();
    const now = new Date();

    const [risks, incidents, measures] = await Promise.all([
      prisma.risk.findMany({
        where: { tenantId },
        select: { title: true, score: true, status: true },
        orderBy: { score: "desc" },
        take: 50,
      }),
      prisma.incident.findMany({
        where: { tenantId },
        select: { title: true, status: true, severity: true },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
      prisma.measure.findMany({
        where: { tenantId },
        select: { title: true, status: true, dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 100,
      }),
    ]);

    const overdueMeasures = measures.filter((item) => item.status !== "DONE" && item.dueAt < now).slice(0, 5);
    const criticalRisks = risks.filter((item) => (item.score || 0) >= 15).slice(0, 5);
    const openIncidents = incidents.filter((item) => item.status !== "CLOSED").slice(0, 5);

    const prompt = `Du er AI-assistent for HMS-leder. Lag kort prioritering.
Svar KUN med gyldig JSON:
{
  "nextActions": [
    { "title": "kort handling 1", "href": "/dashboard/actions" },
    { "title": "kort handling 2", "href": "/dashboard/risks" },
    { "title": "kort handling 3", "href": "/dashboard/incidents" }
  ],
  "monthlySummary": "3-5 setninger med status og prioriteringer"
}

Data:
- Forfalte tiltak: ${JSON.stringify(overdueMeasures)}
- Kritiske risikoer: ${JSON.stringify(criticalRisks)}
- Åpne hendelser: ${JSON.stringify(openIncidents)}`;

    const response = await generateAIResponse(prompt, "gpt-4o-mini", {
      cacheScope: `tenant:${tenantId}:dashboardAssistant`,
      rateLimitScope: `tenant:${tenantId}`,
      budgetScope: `tenant:${tenantId}`,
    });
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        success: true,
        data: {
          nextActions: [
            { title: "Lukk eller omprioriter forfalte tiltak.", href: "/dashboard/actions" },
            { title: "Behandle kritiske risikoer med konkrete tiltak.", href: "/dashboard/risks" },
            { title: "Følg opp åpne hendelser med frist og ansvarlig.", href: "/dashboard/incidents" },
          ],
          monthlySummary:
            "Månedens HMS-bilde viser at fokus bør ligge på forfalte tiltak, kritiske risikoer og raskere lukking av åpne hendelser.",
        },
      };
    }
    const parsed = JSON.parse(match[0]) as {
      nextActions?: Array<{ title?: string; href?: string }>;
      monthlySummary?: string;
    };
    const allowedHrefs = new Set([
      "/dashboard/actions",
      "/dashboard/risks",
      "/dashboard/incidents",
      "/dashboard/training",
      "/dashboard/audits",
      "/dashboard/inspections",
      "/dashboard/sja",
      "/dashboard/goals",
    ]);
    return {
      success: true,
      data: {
        nextActions: Array.isArray(parsed.nextActions)
          ? parsed.nextActions
              .map((item) => ({
                title: (item?.title || "").trim(),
                href: allowedHrefs.has((item?.href || "").trim())
                  ? (item?.href || "").trim()
                  : "/dashboard/actions",
              }))
              .filter((item) => item.title.length > 0)
              .slice(0, 3)
          : [],
        monthlySummary: (parsed.monthlySummary || "").trim(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente AI-assistent" };
  }
}
