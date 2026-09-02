/**
 * AI-modul for HMS Nova
 * Bruker OpenAI API for BHT-analyser og andre AI-funksjoner
 */

import { createHash } from "crypto";
import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/db";
import { retrieveRelevantContext, formatContextForPrompt } from "@/lib/ai-knowledge-base";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const hasUpstashConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redisClient = hasUpstashConfig ? Redis.fromEnv() : null;

const AI_CACHE_TTL_SECONDS = Number(process.env.AI_CACHE_TTL_SECONDS || 1800);
const AI_MAX_CALLS_PER_MINUTE = Number(process.env.AI_MAX_CALLS_PER_MINUTE || 120);
const AI_MONTHLY_BUDGET_USD = Number(process.env.AI_MONTHLY_BUDGET_USD || 300);
const AI_GUARD_ENABLED = process.env.AI_GUARD_ENABLED !== "false";

const INPUT_COST_PER_MILLION = 0.15;
const OUTPUT_COST_PER_MILLION = 0.6;

const memoryCache = new Map<string, { value: string; expiresAt: number }>();
const memoryRateCounter = new Map<string, { count: number; expiresAt: number }>();
const memoryBudgetCounter = new Map<string, number>();
const memoryAiEnabledCache = new Map<string, { enabled: boolean; expiresAt: number }>();
const AI_ENABLED_CACHE_TTL_MS = 30_000;

/**
 * Kastes når en tenant har slått av AI-funksjoner (selvbetjent innstilling, testfase).
 * Fanges opp ved server actions-grensen og vises som en nøytral melding i UI.
 */
export class AiDisabledError extends Error {
  readonly code = "AI_DISABLED" as const;
  constructor(message = "AI er deaktivert for denne virksomheten") {
    super(message);
    this.name = "AiDisabledError";
  }
}

/**
 * Sentralt knutepunkt: sjekker om AI er slått på for en tenant (tenant.aiEnabled).
 * Kort mellomlagring i minnet for å unngå ett DB-oppslag per AI-kall.
 */
export async function isAiEnabledForTenant(tenantId: string): Promise<boolean> {
  const cached = memoryAiEnabledCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.enabled;
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiEnabled: true },
    });
    const enabled = tenant?.aiEnabled ?? true;
    memoryAiEnabledCache.set(tenantId, { enabled, expiresAt: Date.now() + AI_ENABLED_CACHE_TTL_MS });
    return enabled;
  } catch {
    return true; // fail-open ved DB-feil - ikke blokker AI pga. midlertidig oppslagsfeil
  }
}

async function assertAiEnabledForTenant(tenantId?: string): Promise<void> {
  if (!tenantId) return;
  const enabled = await isAiEnabledForTenant(tenantId);
  if (!enabled) {
    throw new AiDisabledError();
  }
}

type VisionContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | VisionContentPart[];
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface GenerateAIResponseOptions {
  cacheScope?: string;
  rateLimitScope?: string;
  budgetScope?: string;
  bypassCache?: boolean;
  /** Tenant-ID for AI-av/på-sjekk (tenant.aiEnabled). Utelates kallet fra gaten hvis ikke satt. */
  tenantId?: string;
  /** Søkefritekst mot AI-kunnskapsbasen (RAG - lovtekst/rutinemaler). Gir mer presise, lovforankrede svar. Utelates hvis ikke satt. */
  ragQuery?: string;
}

/** Henter RAG-kontekst trygt - feil her skal aldri stoppe selve AI-kallet, kun gi mindre presist svar. */
async function buildRagContextBlock(ragQuery?: string): Promise<string> {
  if (!ragQuery) return "";
  try {
    const results = await retrieveRelevantContext(ragQuery, 4);
    return formatContextForPrompt(results);
  } catch {
    return "";
  }
}

function getMinuteKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(
    2,
    "0"
  )}`;
}

function getMonthKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function estimatePromptTokens(prompt: string): number {
  return Math.max(1, Math.round(prompt.length / 4));
}

function estimateUsdCost(promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1_000_000) * INPUT_COST_PER_MILLION + (completionTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
}

async function getCachedResponse(cacheKey: string): Promise<string | null> {
  const now = Date.now();
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry && memoryEntry.expiresAt > now) {
    return memoryEntry.value;
  }
  if (memoryEntry && memoryEntry.expiresAt <= now) {
    memoryCache.delete(cacheKey);
  }

  if (!redisClient) return null;
  try {
    const value = await redisClient.get<string>(cacheKey);
    return value || null;
  } catch {
    return null;
  }
}

async function setCachedResponse(cacheKey: string, value: string): Promise<void> {
  const expiresAt = Date.now() + AI_CACHE_TTL_SECONDS * 1000;
  memoryCache.set(cacheKey, { value, expiresAt });
  if (!redisClient) return;
  try {
    await redisClient.set(cacheKey, value, { ex: AI_CACHE_TTL_SECONDS });
  } catch {
    // cache-fail skal ikke stoppe brukerflyt
  }
}

async function checkAiRateLimit(scope: string): Promise<void> {
  const now = new Date();
  const minuteKey = getMinuteKey(now);
  const key = `ai:rate:${scope}:${minuteKey}`;

  const memoryItem = memoryRateCounter.get(key);
  if (!memoryItem || memoryItem.expiresAt <= Date.now()) {
    memoryRateCounter.set(key, { count: 1, expiresAt: Date.now() + 65_000 });
  } else {
    memoryItem.count += 1;
    memoryRateCounter.set(key, memoryItem);
    if (memoryItem.count > AI_MAX_CALLS_PER_MINUTE) {
      throw new Error("AI er midlertidig travelt. Prøv igjen om et minutt.");
    }
  }

  if (!redisClient) return;
  try {
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, 70);
    }
    if (count > AI_MAX_CALLS_PER_MINUTE) {
      throw new Error("AI er midlertidig travelt. Prøv igjen om et minutt.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("AI er midlertidig travelt")) {
      throw error;
    }
    // fail-open ved redis-feil
  }
}

async function checkAndTrackBudget(scope: string, estimatedCostUsd: number): Promise<void> {
  if (AI_MONTHLY_BUDGET_USD <= 0) return;

  const monthKey = getMonthKey(new Date());
  const budgetKey = `ai:budget:${scope}:${monthKey}`;
  const currentMemoryCost = memoryBudgetCounter.get(budgetKey) || 0;
  const nextMemoryCost = currentMemoryCost + estimatedCostUsd;
  memoryBudgetCounter.set(budgetKey, nextMemoryCost);

  if (nextMemoryCost > AI_MONTHLY_BUDGET_USD) {
    throw new Error("Månedlig AI-budsjett er nådd. Kontakt administrator.");
  }

  if (!redisClient) return;
  try {
    const cents = Math.max(1, Math.round(estimatedCostUsd * 100));
    const totalCents = await redisClient.incrby(budgetKey, cents);
    const ttlSeconds = 60 * 60 * 24 * 35;
    if (totalCents === cents) {
      await redisClient.expire(budgetKey, ttlSeconds);
    }
    if (totalCents / 100 > AI_MONTHLY_BUDGET_USD) {
      throw new Error("Månedlig AI-budsjett er nådd. Kontakt administrator.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Månedlig AI-budsjett er nådd")) {
      throw error;
    }
    // fail-open ved redis-feil
  }
}

/**
 * Generer AI-respons via OpenAI API
 */
export async function generateAIResponse(
  prompt: string,
  model: string = "gpt-4o-mini",
  options?: GenerateAIResponseOptions
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OPENAI_API_KEY ikke konfigurert - AI-funksjoner deaktivert");
    throw new Error("AI er ikke konfigurert");
  }

  await assertAiEnabledForTenant(options?.tenantId);

  const ragContext = await buildRagContextBlock(options?.ragQuery);
  const systemPrompt = `Du er en erfaren HMS-rådgiver og yrkeshygieniker som jobber for en godkjent bedriftshelsetjeneste i Norge. 
Du gir faglige råd basert på norsk arbeidsmiljølovgivning (AML), forskrift om organisering, ledelse og medvirkning, 
internkontrollforskriften, og BHT-forskriften. Svar alltid på norsk. Vær konkret og praktisk orientert.${
    ragContext ? `\n\n${ragContext}` : ""
  }`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const cacheScope = options?.cacheScope || "global";
  const rateLimitScope = options?.rateLimitScope || "global";
  const budgetScope = options?.budgetScope || "global";
  const payloadFingerprint = `${model}:${prompt}:${options?.ragQuery ?? ""}`;
  const payloadHash = hashValue(payloadFingerprint);
  const cacheKey = `ai:cache:${cacheScope}:${payloadHash}`;

  if (AI_GUARD_ENABLED && !options?.bypassCache) {
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
    await checkAiRateLimit(rateLimitScope);
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API feil: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content || "";

    if (AI_GUARD_ENABLED) {
      const promptTokens = data.usage?.prompt_tokens ?? estimatePromptTokens(prompt);
      const completionTokens = data.usage?.completion_tokens ?? Math.max(1, Math.round(content.length / 4));
      const estimatedUsdCost = estimateUsdCost(promptTokens, completionTokens);
      await checkAndTrackBudget(budgetScope, estimatedUsdCost);
      if (!options?.bypassCache) {
        await setCachedResponse(cacheKey, content);
      }
    }

    return content;
  } catch (error) {
    console.error("AI generation error:", error);
    throw error;
  }
}

/**
 * Multimodal kall (tekst + bilder som base64 data-URL) for årsaksanalyse m.m.
 * Bilder begrenses av app-laget før kall (antall/størrelse).
 */
export async function generateAIResponseWithVision(
  textPrompt: string,
  images: Array<{ mime: string; base64: string }>,
  model: string = "gpt-4o-mini",
  options?: GenerateAIResponseOptions
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OPENAI_API_KEY ikke konfigurert - AI-funksjoner deaktivert");
    throw new Error("AI er ikke konfigurert");
  }

  await assertAiEnabledForTenant(options?.tenantId);

  const userParts: VisionContentPart[] = [{ type: "text", text: textPrompt }];
  for (const img of images) {
    const url = `data:${img.mime};base64,${img.base64}`;
    userParts.push({
      type: "image_url",
      image_url: { url, detail: "low" },
    });
  }

  const ragContext = await buildRagContextBlock(options?.ragQuery);
  const systemPrompt = `Du er en erfaren HMS-rådgiver og yrkeshygieniker som jobber for en godkjent bedriftshelsetjeneste i Norge. 
Du gir faglige råd basert på norsk arbeidsmiljølovgivning (AML), forskrift om organisering, ledelse og medvirkning, 
internkontrollforskriften, og BHT-forskriften. Svar alltid på norsk. Vær konkret og praktisk orientert.${
    ragContext ? `\n\n${ragContext}` : ""
  }`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userParts,
    },
  ];

  const cacheScope = options?.cacheScope || "global";
  const rateLimitScope = options?.rateLimitScope || "global";
  const budgetScope = options?.budgetScope || "global";
  const visionFingerprint = `${model}:${textPrompt}:${options?.ragQuery ?? ""}:${images.map((i) => `${i.mime}:${i.base64.length}:${hashValue(i.base64.slice(0, 4096))}`).join("|")}`;
  const payloadHash = hashValue(visionFingerprint);
  const cacheKey = `ai:cache:${cacheScope}:${payloadHash}`;

  if (AI_GUARD_ENABLED && !options?.bypassCache) {
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }
    await checkAiRateLimit(rateLimitScope);
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API feil: ${response.status}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content || "";

    if (AI_GUARD_ENABLED) {
      const promptTokens =
        data.usage?.prompt_tokens ?? estimatePromptTokens(textPrompt + images.map((i) => i.base64).join(""));
      const completionTokens = data.usage?.completion_tokens ?? Math.max(1, Math.round(content.length / 4));
      const estimatedUsdCost = estimateUsdCost(promptTokens, completionTokens);
      await checkAndTrackBudget(budgetScope, estimatedUsdCost);
      if (!options?.bypassCache) {
        await setCachedResponse(cacheKey, content);
      }
    }

    return content;
  } catch (error) {
    console.error("AI generation error:", error);
    throw error;
  }
}

/** Kategorier fra Prisma sin RiskCategory-enum - brukes for å holde alle AI-risikoforslag konsistente med datamodellen. */
const RISK_CATEGORY_ENUM_LIST =
  "STRATEGIC|OPERATIONAL|SAFETY|HEALTH|ENVIRONMENTAL|LEGAL|INFORMATION_SECURITY|PSYCHOSOCIAL|ERGONOMIC|ORGANISATIONAL|PHYSICAL";

/**
 * Generer HMS-risikoanalyse (bulk-forslag for en hel årlig risikovurdering).
 *
 * ISO 45001 kap. 6.1.2 krever at farer identifiseres og risiko vurderes for sannsynlighet,
 * konsekvens, eksisterende barrierer og gjenværende (rest)risiko. Derfor ber vi AI om full
 * kontekst per forslag - ikke bare en risikotittel - slik at hvert punkt kan lagres direkte
 * som et fullverdig Risk-objekt uten manuell etterutfylling.
 */
export async function generateRiskAnalysis(
  industry: string,
  employeeCount: number,
  existingRisks: string[],
  existingIncidents: string[],
  options?: GenerateAIResponseOptions
): Promise<{
  suggestedRisks: {
    risk: string;
    description: string;
    riskStatement: string;
    existingControls: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    category: string;
    rationale: string;
    suggestedMeasures: string[];
  }[];
}> {
  const prompt = `Du er HMS-rådgiver og skal utarbeide grunnlag for en årlig risikovurdering (ISO 45001 kap. 6.1.2 og 8.1.2) for en norsk bedrift.
- Bransje: ${industry}
- Antall ansatte: ${employeeCount}
- Eksisterende risikoer i systemet: ${existingRisks.join(", ") || "Ingen registrert"}
- Tidligere avvik/hendelser: ${existingIncidents.join(", ") || "Ingen registrert"}

Foreslå 4-8 konkrete, bransjerelevante risikoer. For HVER risiko skal du gi FULLSTENDIG innhold - ikke bare en overskrift - slik at HMS-ansvarlig kan lagre punktet direkte uten å måtte skrive noe selv først.

Svar KUN med gyldig JSON i formatet:
{
  "suggestedRisks": [
    {
      "risk": "kort, konkret tittel på risikoen (maks 10 ord)",
      "description": "2-4 setninger som beskriver situasjonen/scenarioet: hvor det skjer, hvem som er utsatt, og under hvilke forhold risikoen oppstår",
      "riskStatement": "én setning på formen «Dersom [scenario], kan det medføre [konsekvens]» - konkret konsekvensbeskrivelse, ikke en gjentakelse av tittelen",
      "existingControls": "1-3 setninger om hvilke barrierer/rutiner/verneutstyr som normalt bør være på plass i denne bransjen for denne risikoen (bruk kunnskapsbasen under hvis relevant)",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "category": "${RISK_CATEGORY_ENUM_LIST}",
      "rationale": "kort begrunnelse for hvorfor akkurat denne bedriften (bransje/størrelse/historikk) bør vurdere denne risikoen",
      "suggestedMeasures": ["konkret tiltak 1", "konkret tiltak 2", "konkret tiltak 3"]
    }
  ]
}

Krav:
- Ikke gjenta risikoer som allerede finnes i listen over.
- Bruk severity CRITICAL kun for risiko som kan medføre død eller varig alvorlig skade.
- category skal være EN av verdiene i listen over - ikke oversett til norsk.
- Maks 4 tiltak per risiko, konkrete og gjennomførbare (ikke generiske som "følg rutiner").
- Norsk språk, presist og praktisk - ikke fyllord.`;

  const response = await generateAIResponse(prompt, "gpt-4o-mini", {
    ...options,
    ragQuery: options?.ragQuery ?? `Risikovurdering og HMS-tiltak for bransje ${industry}`,
  });
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return { suggestedRisks: [] };
}

export async function generateRiskAssessmentItemDraft(
  industry: string,
  riskType: string,
  preferredCategory: string,
  existingRisks: string[],
  businessContext?: string,
  options?: GenerateAIResponseOptions
): Promise<{
  title: string;
  beskrivelse: string;
  konsekvens: string;
  eksisterendeKontroller: string;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  suggestedMeasures: string[];
}> {
  const prompt = `Du er HMS-rådgiver og skal lage ETT konkret, fullstendig risikopunkt for HMS-risikovurdering i Norge (ISO 45001 kap. 6.1.2).
- Bransje: ${industry}
- Risikotype valgt av bruker: ${riskType}
- Foretrukket kategori: ${preferredCategory}
- Underbransje/arbeidstype: ${businessContext?.trim() || "Ikke oppgitt"}
- Eksisterende risikoer: ${existingRisks.join(", ") || "Ingen registrert"}

Innholdet skal være fyldig nok til at HMS-ansvarlig kan lagre risikopunktet direkte i risikovurderingen uten å måtte skrive noe selv - dette brukes som reelt journalført grunnlag, ikke et forslag til overskrift.

Svar KUN med gyldig JSON i formatet:
{
  "title": "kort, konkret tittel (maks 10 ord)",
  "beskrivelse": "3-5 setninger: beskriv konkret arbeidssituasjon/scenario, hvor og når det oppstår, hvem som er utsatt, og hvorfor risikoen er reell for denne bransjen",
  "konsekvens": "2-3 setninger om hva som konkret kan skje dersom risikoen materialiserer seg (skadetype, alvorlighet, evt. driftskonsekvens)",
  "eksisterendeKontroller": "2-4 setninger om hvilke barrierer, rutiner, verneutstyr eller opplæring som normalt bør være på plass for denne risikotypen i denne bransjen",
  "level": "LOW|MEDIUM|HIGH|CRITICAL",
  "category": "PSYCHOSOCIAL|ERGONOMIC|ORGANISATIONAL|PHYSICAL|SAFETY|HEALTH|OPERATIONAL|ENVIRONMENTAL",
  "suggestedMeasures": ["konkret tiltak 1", "konkret tiltak 2", "konkret tiltak 3", "konkret tiltak 4"]
}

Krav:
- Skal være praktisk, konkret og bransjetilpasset - ikke generiske fraser.
- Maks 4 tiltak i suggestedMeasures, hvert tiltak skal være gjennomførbart og målbart.
- Bruk level CRITICAL kun for risiko som kan medføre død eller varig alvorlig skade.
- Ikke gjenta risikoer som allerede finnes.
- Norsk språk.`;

  const response = await generateAIResponse(prompt, "gpt-4o-mini", {
    ...options,
    ragQuery: options?.ragQuery ?? `Risiko innen ${riskType} (${preferredCategory}) for bransje ${industry}`,
  });
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return {
    title: "",
    beskrivelse: "",
    konsekvens: "",
    eksisterendeKontroller: "",
    level: "MEDIUM",
    category: preferredCategory,
    suggestedMeasures: [],
  };
}

