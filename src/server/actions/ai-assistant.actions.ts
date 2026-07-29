"use server";

import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getActionContext } from "./action-context";
import { generateAIResponse, generateAIResponseWithVision } from "@/lib/ai";
import { getStorage } from "@/lib/storage";
import { getIndustryLabel } from "@/lib/industry-packages";

const incidentDraftSchema = z.object({
  mode: z.enum(["INCIDENT", "RUH"]).optional().default("INCIDENT"),
  type: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(10),
  severity: z.number().int().min(1).max(5).nullish(),
  incidentContext: z.string().optional(),
  availableIncidentTypes: z.array(z.string()).optional(),
  availableRuhCategories: z.array(z.string()).optional(),
});

const incidentQualitySchema = z.object({
  type: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(10),
  immediateAction: z.string().optional(),
  suggestedActions: z.string().optional(),
  severity: z.number().int().min(1).max(5).nullish(),
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
  mode?: "INCIDENT" | "RUH";
  type: string;
  title: string;
  description: string;
  severity?: number | null;
  incidentContext?: string;
  availableIncidentTypes?: string[];
  availableRuhCategories?: string[];
}) {
  try {
    const validated = incidentDraftSchema.parse(input);
    const { tenantId, role } = await getActionContext();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });

    const resolvedRole = role || "ANSATT";
    const industry = getIndustryLabel(tenant?.industry || "other");
    const modeSpecificInstruction =
      validated.mode === "RUH"
        ? `Du lager forslag for RUH-flyt. Velg én kategori fra listen under hvis mulig.
Liste over gyldige RUH-kategorier: ${JSON.stringify(validated.availableRuhCategories ?? [])}`
        : `Du lager forslag for avviksflyt. Velg én type fra listen under hvis mulig.
Liste over gyldige avvikstyper: ${JSON.stringify(validated.availableIncidentTypes ?? [])}`;

    const prompt = `Du skal hjelpe en ${resolvedRole}-bruker i bransjen ${industry} med hendelsesbehandling i norsk HMS-system.
Lag KUN gyldig JSON:
{
  "rootCause":"kort sannsynlig rotarsak",
  "immediateAction":"konkret umiddelbar handling i preteritum",
  "suggestedActions":["konkret tiltak 1","konkret tiltak 2","konkret tiltak 3"],
  "severitySuggestion": 1-5,
  "suggestedType":"foreslått avvikstype eller tom streng",
  "suggestedRuhCategory":"foreslått RUH-kategori eller tom streng"
}

Hendelse:
- Modus: ${validated.mode}
- Type: ${validated.type}
- Tittel: ${validated.title}
- Beskrivelse: ${validated.description}
- Alvorlighetsgrad nå: ${validated.severity ?? "ikke vurdert"}
- Kontekst: ${validated.incidentContext || "ikke oppgitt"}

Krav:
- Norsk språk.
- Tiltak skal være praktiske og korte.
- SeveritySuggestion skal være realistisk og innen 1-5.
- ${modeSpecificInstruction}`;

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
      suggestedType?: string;
      suggestedRuhCategory?: string;
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
            : validated.severity ?? null,
        suggestedType: (parsed.suggestedType || "").trim(),
        suggestedRuhCategory: (parsed.suggestedRuhCategory || "").trim(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke generere AI-forslag" };
  }
}

const suggestRootCauseInputSchema = z.object({
  incidentId: z.string().min(1),
});

const VISION_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_ROOT_CAUSE_IMAGES = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function formatFiveWhyDraft(
  steps: Array<{ step: number; question: string; draftAnswer: string }>,
  conclusion: string
): string {
  const body = steps
    .map((s) => `${s.step}) ${s.question}\n   → ${s.draftAnswer || "(—)"}`)
    .join("\n\n");
  const tail = conclusion.trim()
    ? `\n\nKonklusjon — sannsynlig grunnårsak:\n${conclusion.trim()}`
    : "";
  return `5 Hvorfor (utkast — må verifiseres av utreder):\n\n${body}${tail}`;
}

/**
 * Forslag til grunnårsak ved utredning av avvik (ISO 9001: årsaksanalyse).
 * Modellen strukturerer som 5 Hvorfor-spørsmål med utkast til svar, deretter konklusjon.
 * Tekst fra avviket og inntil tre bildevedlegg sendes til modellen; utreder skal alltid verifisere.
 */
export async function suggestIncidentRootCauseAnalysis(input: { incidentId: string }) {
  try {
    const { incidentId } = suggestRootCauseInputSchema.parse(input);
    const { tenantId } = await getActionContext();

    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
      select: {
        title: true,
        description: true,
        type: true,
        immediateAction: true,
        location: true,
        witnessName: true,
        suggestedActions: true,
        attachments: {
          select: { fileKey: true, mime: true, name: true, size: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!incident) {
      return { success: false, error: "Avvik ikke funnet" };
    }

    const storage = getStorage();
    const imageCandidates = incident.attachments.filter(
      (a) => VISION_IMAGE_MIMES.has(a.mime) && (a.size == null || a.size <= MAX_IMAGE_BYTES)
    );

    const visionImages: Array<{ mime: string; base64: string }> = [];
    for (const att of imageCandidates) {
      if (visionImages.length >= MAX_ROOT_CAUSE_IMAGES) break;
      const buf = await storage.get(att.fileKey);
      if (!buf || buf.length === 0 || buf.length > MAX_IMAGE_BYTES) continue;
      visionImages.push({ mime: att.mime, base64: buf.toString("base64") });
    }

    const prompt = `Du hjelper med årsaksanalyse i et norsk HMS-system (ISO 9001: korrigerende tiltak og årsaksanalyse).
Basert på opplysningene under og eventuelle bilder: lag et FORSLAG til 5 Hvorfor-kjede (ISO 9001: årsaksanalyse; metode som 5 Whys).

KRAV:
- Bygg nøyaktig fem ledd. Hvert ledd skal ha ett tydelig "Hvorfor ...?"-spørsmål som følger logisk fra forrige svar (første spørsmål tar utgangspunkt i hendelsen).
- "draftAnswer" er et mulig svar ut fra tilgjengelig informasjon — utreder må bekrefte eller korrigere.
- Ikke påstå sikkerhet der informasjonen er tynn; bruk forbehold i draftAnswer der det er naturlig.
- "rootCauseConclusion" skal kort oppsummere sannsynlig grunnårsak ETTER femte svar (symptom vs rotårsak).
- "contributingFactors": andre medvirkende faktorer (tid, kommunikasjon, utstyr, osv.) eller tom streng.
- Norsk språk.

Svar KUN med gyldig JSON:
{
  "fiveWhys": [
    { "step": 1, "question": "Hvorfor ...?", "draftAnswer": "Fordi ..." },
    { "step": 2, "question": "Hvorfor ...?", "draftAnswer": "..." },
    { "step": 3, "question": "Hvorfor ...?", "draftAnswer": "..." },
    { "step": 4, "question": "Hvorfor ...?", "draftAnswer": "..." },
    { "step": 5, "question": "Hvorfor ...?", "draftAnswer": "..." }
  ],
  "rootCauseConclusion": "1–4 setninger",
  "contributingFactors": "kort avsnitt eller tom streng"
}

Hendelsesdata:
- Type (enum): ${incident.type}
- Tittel: ${incident.title}
- Beskrivelse: ${incident.description}
- Sted: ${incident.location?.trim() || "ikke oppgitt"}
- Vitne: ${incident.witnessName?.trim() || "ikke oppgitt"}
- Umiddelbare tiltak: ${incident.immediateAction?.trim() || "ikke oppgitt"}
- Foreslåtte tiltak (fra registrering): ${incident.suggestedActions?.trim() || "ikke oppgitt"}
${visionImages.length > 0 ? "Det følger " + visionImages.length + " bilde(r) som kontekst." : "Ingen bilder vedlagt."}`;

    const response =
      visionImages.length > 0
        ? await generateAIResponseWithVision(prompt, visionImages, "gpt-4o-mini", {
            cacheScope: `tenant:${tenantId}:incidentRootCauseVision:${incidentId}`,
            rateLimitScope: `tenant:${tenantId}`,
            budgetScope: `tenant:${tenantId}`,
            bypassCache: true,
          })
        : await generateAIResponse(prompt, "gpt-4o-mini", {
            cacheScope: `tenant:${tenantId}:incidentRootCause:${incidentId}:${createHash("sha256").update(incident.description).digest("hex").slice(0, 24)}`,
            rateLimitScope: `tenant:${tenantId}`,
            budgetScope: `tenant:${tenantId}`,
          });

    const match = response.match(/\{[\s\S]*\}/);
    if (!match) {
      return { success: false, error: "AI returnerte ugyldig format" };
    }
    const parsed = JSON.parse(match[0]) as {
      fiveWhys?: Array<{ step?: number; question?: string; draftAnswer?: string }>;
      rootCauseConclusion?: string;
      rootCause?: string;
      contributingFactors?: string;
    };

    const rawSteps = Array.isArray(parsed.fiveWhys) ? parsed.fiveWhys : [];
    const fiveWhys = rawSteps
      .slice(0, 5)
      .map((row, idx) => ({
        step: typeof row?.step === "number" ? row.step : idx + 1,
        question: String(row?.question ?? "").trim(),
        draftAnswer: String(row?.draftAnswer ?? "").trim(),
      }))
      .filter((row) => row.question.length > 0);

    const conclusion = (parsed.rootCauseConclusion ?? parsed.rootCause ?? "").trim();
    const contributing = (parsed.contributingFactors ?? "").trim();

    let rootCauseText: string;
    if (fiveWhys.length > 0) {
      const numbered = fiveWhys.map((row, idx) => ({ ...row, step: idx + 1 }));
      rootCauseText = formatFiveWhyDraft(numbered, conclusion);
    } else {
      rootCauseText = conclusion;
    }

    return {
      success: true,
      data: {
        rootCause: rootCauseText,
        contributingFactors: contributing,
        fiveWhys:
          fiveWhys.length > 0
            ? fiveWhys.map((row, idx) => ({
                step: idx + 1,
                question: row.question,
                draftAnswer: row.draftAnswer,
              }))
            : undefined,
        usedImageCount: visionImages.length,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke foreslå grunnårsak" };
  }
}

export async function runAiIncidentQualityCheck(input: {
  type: string;
  title: string;
  description: string;
  immediateAction?: string;
  suggestedActions?: string;
  severity?: number | null;
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
- Alvorlighetsgrad: ${validated.severity ?? "ikke vurdert"}

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
