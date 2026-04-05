/**
 * AI-modul for HMS Nova
 * Bruker OpenAI API for BHT-analyser og andre AI-funksjoner
 */

import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

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

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Du er en erfaren HMS-rådgiver og yrkeshygieniker som jobber for en godkjent bedriftshelsetjeneste i Norge. 
Du gir faglige råd basert på norsk arbeidsmiljølovgivning (AML), forskrift om organisering, ledelse og medvirkning, 
internkontrollforskriften, og BHT-forskriften. Svar alltid på norsk. Vær konkret og praktisk orientert.`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  const cacheScope = options?.cacheScope || "global";
  const rateLimitScope = options?.rateLimitScope || "global";
  const budgetScope = options?.budgetScope || "global";
  const payloadFingerprint = `${model}:${prompt}`;
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

  const userParts: VisionContentPart[] = [{ type: "text", text: textPrompt }];
  for (const img of images) {
    const url = `data:${img.mime};base64,${img.base64}`;
    userParts.push({
      type: "image_url",
      image_url: { url, detail: "low" },
    });
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Du er en erfaren HMS-rådgiver og yrkeshygieniker som jobber for en godkjent bedriftshelsetjeneste i Norge. 
Du gir faglige råd basert på norsk arbeidsmiljølovgivning (AML), forskrift om organisering, ledelse og medvirkning, 
internkontrollforskriften, og BHT-forskriften. Svar alltid på norsk. Vær konkret og praktisk orientert.`,
    },
    {
      role: "user",
      content: userParts,
    },
  ];

  const cacheScope = options?.cacheScope || "global";
  const rateLimitScope = options?.rateLimitScope || "global";
  const budgetScope = options?.budgetScope || "global";
  const visionFingerprint = `${model}:${textPrompt}:${images.map((i) => `${i.mime}:${i.base64.length}:${hashValue(i.base64.slice(0, 4096))}`).join("|")}`;
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

/**
 * Generer HMS-risikoanalyse
 */
export async function generateRiskAnalysis(
  industry: string,
  employeeCount: number,
  existingRisks: string[],
  existingIncidents: string[],
  options?: GenerateAIResponseOptions
): Promise<{
  suggestedRisks: { risk: string; severity: string; category: string; rationale?: string }[];
  suggestedActions: { action: string; priority: string }[];
}> {
  const prompt = `Analyser arbeidsmiljørisiko for denne bedriften:
- Bransje: ${industry}
- Antall ansatte: ${employeeCount}
- Eksisterende risikoer: ${existingRisks.join(", ") || "Ingen registrert"}
- Tidligere avvik: ${existingIncidents.join(", ") || "Ingen registrert"}

Generer JSON med foreslåtte risikoer og tiltak:
{
  "suggestedRisks": [{"risk": "beskrivelse", "severity": "LOW|MEDIUM|HIGH", "category": "ergonomi|sikkerhet|psykososialt|kjemisk|fysisk", "rationale": "kort begrunnelse basert på bransje/historikk"}],
  "suggestedActions": [{"action": "tiltak", "priority": "HIGH|MEDIUM|LOW"}]
}`;

  const response = await generateAIResponse(prompt, "gpt-4o-mini", options);
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return { suggestedRisks: [], suggestedActions: [] };
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
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  suggestedMeasures: string[];
}> {
  const prompt = `Lag ett konkret forslag til risikopunkt for HMS-risikovurdering i Norge.
- Bransje: ${industry}
- Risikotype valgt av bruker: ${riskType}
- Foretrukket kategori: ${preferredCategory}
- Underbransje/arbeidstype: ${businessContext?.trim() || "Ikke oppgitt"}
- Eksisterende risikoer: ${existingRisks.join(", ") || "Ingen registrert"}

Svar KUN med gyldig JSON i formatet:
{
  "title": "kort tittel",
  "beskrivelse": "kort praktisk beskrivelse av scenario",
  "konsekvens": "hva som kan skje",
  "level": "LOW|MEDIUM|HIGH|CRITICAL",
  "category": "PSYCHOSOCIAL|ERGONOMIC|ORGANISATIONAL|PHYSICAL|SAFETY|HEALTH|OPERATIONAL|ENVIRONMENTAL",
  "suggestedMeasures": ["tiltak 1", "tiltak 2", "tiltak 3"]
}

Krav:
- Skal være praktisk og bransjetilpasset.
- Maks 3 tiltak i suggestedMeasures.
- Ikke gjenta risikoer som allerede finnes.
- Norsk språk.`;

  const response = await generateAIResponse(prompt, "gpt-4o-mini", options);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return {
    title: "",
    beskrivelse: "",
    konsekvens: "",
    level: "MEDIUM",
    category: preferredCategory,
    suggestedMeasures: [],
  };
}

