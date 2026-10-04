import { z } from "zod";

import {
  electricalWorkTypes,
  type ElectricalWorkType,
} from "@/features/sja/lib/sja-fse";

export const MAX_SJA_AI_IMAGES = 3;
export const MAX_SJA_AI_IMAGE_BYTES = 4 * 1024 * 1024;
export const SJA_AI_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const sjaAiInputSchema = z.object({
  briefing: z.string().trim().min(10, "Beskriv arbeidet med minst 10 tegn").max(4_000),
  workLocation: z.string().trim().max(300).default(""),
  weatherConditions: z.string().trim().max(500).default(""),
  templateHint: z.string().trim().max(500).default(""),
  electricalWorkType: z.enum(electricalWorkTypes).default("NOT_APPLICABLE"),
});

const sjaAiHazardSchema = z.object({
  activity: z.string().min(1).max(300),
  hazard: z.string().min(1).max(500),
  consequence: z.string().max(500),
  probability: z.number().int().min(1).max(5),
  severity: z.number().int().min(1).max(5),
  measures: z.string().min(1).max(2_000),
});

export const sjaAiDraftSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(4_000),
  additionalConditions: z.string().max(4_000),
  electricalWorkType: z.enum(electricalWorkTypes),
  workMethod: z.string().max(4_000),
  requiredEquipment: z.string().max(4_000),
  requiredPpe: z.string().max(4_000),
  personnelRequirements: z.string().max(4_000),
  safetyConditions: z.string().max(4_000),
  stopCriteria: z.string().min(10).max(2_000),
  requiresWrittenInstruction: z.boolean(),
  specialRequirementReview: z.array(z.string().min(1).max(300)).max(10),
  warnings: z.array(z.string().min(1).max(300)).max(10),
  hazards: z.array(sjaAiHazardSchema).min(1).max(12),
});

export type SjaAiInput = z.infer<typeof sjaAiInputSchema>;
export type SjaAiDraft = z.infer<typeof sjaAiDraftSchema>;

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanList(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, 300))
    .filter(Boolean)
    .slice(0, maxItems);
}

function clampRiskValue(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(5, Math.round(numeric)));
}

export function redactSjaBriefing(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[e-post fjernet]")
    .replace(/(?:\+?\d[\d\s()-]{6,}\d)/g, "[telefonnummer fjernet]")
    .trim()
    .slice(0, 4_000);
}

export function normalizeSjaAiDraft(
  value: unknown,
  fallbackWorkType: ElectricalWorkType = "NOT_APPLICABLE",
): SjaAiDraft | null {
  const parsed = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawHazards = Array.isArray(parsed.hazards) ? parsed.hazards : [];
  const hazards = rawHazards
    .map((item) => {
      const hazard = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        activity: cleanText(hazard.activity, 300),
        hazard: cleanText(hazard.hazard, 500),
        consequence: cleanText(hazard.consequence, 500),
        probability: clampRiskValue(hazard.probability),
        severity: clampRiskValue(hazard.severity),
        measures: cleanText(hazard.measures, 2_000),
      };
    })
    .filter((hazard) => hazard.activity && hazard.hazard && hazard.measures)
    .slice(0, 12);

  const suggestedWorkType = electricalWorkTypes.includes(
    parsed.electricalWorkType as ElectricalWorkType,
  )
    ? (parsed.electricalWorkType as ElectricalWorkType)
    : fallbackWorkType;

  const normalized = {
    title: cleanText(parsed.title, 200),
    description: cleanText(parsed.description, 4_000),
    additionalConditions: cleanText(parsed.additionalConditions, 4_000),
    electricalWorkType: suggestedWorkType,
    workMethod: cleanText(parsed.workMethod, 4_000),
    requiredEquipment: cleanText(parsed.requiredEquipment, 4_000),
    requiredPpe: cleanText(parsed.requiredPpe, 4_000),
    personnelRequirements: cleanText(parsed.personnelRequirements, 4_000),
    safetyConditions: cleanText(parsed.safetyConditions, 4_000),
    stopCriteria: cleanText(parsed.stopCriteria, 2_000),
    requiresWrittenInstruction: parsed.requiresWrittenInstruction === true,
    specialRequirementReview: cleanList(parsed.specialRequirementReview, 10),
    warnings: cleanList(parsed.warnings, 10),
    hazards,
  };

  const result = sjaAiDraftSchema.safeParse(normalized);
  return result.success ? result.data : null;
}

export function parseSjaAiResponse(
  response: string,
  fallbackWorkType: ElectricalWorkType,
): SjaAiDraft | null {
  const match = response.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return normalizeSjaAiDraft(JSON.parse(match[0]), fallbackWorkType);
  } catch {
    return null;
  }
}

export function buildSjaAiPrompt(input: SjaAiInput & { industry: string }): string {
  const briefing = redactSjaBriefing(input.briefing);
  const location = redactSjaBriefing(input.workLocation);

  return `Du lager et REDIGERBART UTKAST til sikker jobb-analyse (SJA) for norsk arbeidsliv.
SJA er en metode for oppgave- og stedsspesifikk risikovurdering, ikke en automatisk lovgodkjenning.

Rettslig grunnlag og krav:
- Arbeidsmiljøloven §§ 2-3, 3-1 og 3-2: medvirkning, risikovurdering, tiltak, opplæring og stans ved fare.
- Internkontrollforskriften § 5 nr. 6: kartlegging, risikovurdering, planer og tiltak skal dokumenteres.
- Forskrift om organisering, ledelse og medvirkning §§ 7-1 og 10-1: vurder faktiske forhold og prioriter eliminering/kollektive tiltak før personlig verneutstyr.
- Ved særlig fare må behovet for skriftlig arbeidsinstruks vurderes, jf. AML § 3-2 tredje ledd.
- I bygg og anlegg supplerer SJA SHA-planen; SJA erstatter ikke byggherrens spesifikke tiltak.

Virksomhetsbransje: ${input.industry}
Arbeidssted: ${location || "må bekreftes av bruker"}
Vær/forhold: ${input.weatherConditions || "ikke oppgitt"}
Valgt mal/kontekst: ${input.templateHint || "ingen"}
Valgt FSE-type: ${input.electricalWorkType}
Arbeidsbriefing: ${briefing}

Krav til utkastet:
- Del arbeidet i konkrete aktiviteter og identifiser både akutt fare og relevant helseeksponering.
- Tiltak skal være konkrete og følge hierarkiet: eliminering, tekniske/kollektive tiltak, organisatoriske tiltak, deretter PVU.
- Ta med tydelige stans-kriterier ved endringer, nye farer eller manglende barrierer.
- Ikke finn opp navn, deltakere, sertifikater, måleresultater, gjennomførte kontroller eller at tiltak er etablert.
- Ikke sett ansvarlig person. Ikke bekreft FSE-sjekkpunkter, opplæring eller kompetanse.
- Foreslå FSE-type bare når arbeidet tydelig er elektrisk; ellers bruk NOT_APPLICABLE.
- Sannsynlighet og alvorlighet skal være heltall 1–5 og må kontrolleres av brukeren.

Svar KUN med gyldig JSON:
{
  "title": "kort arbeidstittel",
  "description": "konkret avgrensning og arbeidsrekkefølge",
  "additionalConditions": "stedlige forhold, samtidige aktiviteter og kunnskapshull",
  "electricalWorkType": "NOT_APPLICABLE|DE_ENERGIZED|NEAR_LIVE|LIVE_LOW_VOLTAGE|HIGH_VOLTAGE",
  "workMethod": "foreslått sikker arbeidsmetode eller tom streng",
  "requiredEquipment": "nødvendig utstyr som må kontrolleres eller tom streng",
  "requiredPpe": "PVU etter at andre tiltak er vurdert eller tom streng",
  "personnelRequirements": "roller, opplæring og språkkrav uten navn",
  "safetyConditions": "betingelser før og under arbeidet",
  "stopCriteria": "konkrete forhold som medfører umiddelbar stans og ny vurdering",
  "requiresWrittenInstruction": false,
  "specialRequirementReview": ["mulig særkrav som ansvarlig må vurdere"],
  "warnings": ["faktisk forhold som må verifiseres på arbeidsstedet"],
  "hazards": [{
    "activity": "arbeidstrinn",
    "hazard": "fare eller eksponering",
    "consequence": "mulig skade eller helsevirkning",
    "probability": 1,
    "severity": 1,
    "measures": "konkrete tiltak i prioritert rekkefølge"
  }]
}`;
}
