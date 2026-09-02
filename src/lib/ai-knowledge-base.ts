/**
 * HMS Nova AI-kunnskapsbase (RAG – Retrieval Augmented Generation)
 *
 * Indekserer allerede kuratert, lovforankret innhold (LegalReference, RoutineTemplate,
 * DocumentTemplate) som embeddings, og gjør det søkbart som kontekst til AI-forslag.
 * Dette gir mer nøyaktige, HMS Nova-spesifikke svar uten å trene en egen språkmodell -
 * korpuset er lite (få hundre til lav tusentalls chunks), så cosine similarity beregnes
 * direkte i app-kode. Ingen egen vektordatabase nødvendig.
 */

import { prisma } from "@/lib/db";
import type { AiKnowledgeSourceType } from "@prisma/client";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_CHUNK_CHARS = 6000; // god margin under embedding-modellens tokengrense
const EMBEDDING_BATCH_SIZE = 100;

interface OpenAIEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ikke konfigurert - kan ikke bygge AI-kunnskapsbase");
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI embeddings-feil: ${response.status} ${errorText}`);
  }

  const data: OpenAIEmbeddingResponse = await response.json();
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Lager embedding-vektor for én tekst. Brukes til søk/kontekst-oppslag. */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding ?? [];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function flattenJsonToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => flattenJsonToText(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const flat = flattenJsonToText(val);
        return flat ? `${key}: ${flat}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function buildLegalReferenceContent(ref: {
  title: string;
  paragraphRef: string | null;
  description: string;
}): string {
  const heading = [ref.title, ref.paragraphRef ?? ""].filter(Boolean).join(" ");
  return [heading, ref.description].filter(Boolean).join("\n").trim();
}

function buildRoutineTemplateContent(tpl: {
  title: string;
  description: string | null;
  legalReference: string | null;
  content: unknown;
}): string {
  return [
    tpl.title,
    tpl.description ?? "",
    tpl.legalReference ? `Lovhjemmel: ${tpl.legalReference}` : "",
    flattenJsonToText(tpl.content),
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function buildDocumentTemplateContent(tpl: {
  name: string;
  description: string | null;
  pdcaGuidance: unknown;
}): string {
  return [tpl.name, tpl.description ?? "", flattenJsonToText(tpl.pdcaGuidance)]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

interface PendingChunk {
  sourceType: AiKnowledgeSourceType;
  sourceId: string;
  content: string;
}

/**
 * Bygger/oppdaterer alle kunnskapschunks fra LegalReference, RoutineTemplate og DocumentTemplate.
 * Kjøres som engangs-/periodisk jobb, eller trigges på nytt når kildeinnholdet endres.
 */
export async function reindexKnowledgeBase(): Promise<{ indexed: number; skipped: number }> {
  const [legalReferences, routineTemplates, documentTemplates] = await Promise.all([
    prisma.legalReference.findMany(),
    prisma.routineTemplate.findMany({ where: { isActive: true } }),
    prisma.documentTemplate.findMany(),
  ]);

  const pending: PendingChunk[] = [];

  for (const ref of legalReferences) {
    const content = buildLegalReferenceContent(ref).slice(0, MAX_CHUNK_CHARS);
    if (content) pending.push({ sourceType: "LEGAL_REFERENCE", sourceId: ref.id, content });
  }
  for (const tpl of routineTemplates) {
    const content = buildRoutineTemplateContent(tpl).slice(0, MAX_CHUNK_CHARS);
    if (content) pending.push({ sourceType: "ROUTINE_TEMPLATE", sourceId: tpl.id, content });
  }
  for (const tpl of documentTemplates) {
    const content = buildDocumentTemplateContent(tpl).slice(0, MAX_CHUNK_CHARS);
    if (content) pending.push({ sourceType: "DOCUMENT_TEMPLATE", sourceId: tpl.id, content });
  }

  let indexed = 0;
  let skipped = 0;

  for (let i = 0; i < pending.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBEDDING_BATCH_SIZE);
    try {
      const embeddings = await embedTexts(batch.map((item) => item.content));
      await Promise.all(
        batch.map((item, idx) =>
          prisma.aiKnowledgeChunk.upsert({
            where: { sourceType_sourceId: { sourceType: item.sourceType, sourceId: item.sourceId } },
            create: {
              sourceType: item.sourceType,
              sourceId: item.sourceId,
              content: item.content,
              embedding: embeddings[idx],
              model: EMBEDDING_MODEL,
            },
            update: {
              content: item.content,
              embedding: embeddings[idx],
              model: EMBEDDING_MODEL,
            },
          }),
        ),
      );
      indexed += batch.length;
    } catch (error) {
      console.error("Kunne ikke indeksere batch i AI-kunnskapsbasen:", error);
      skipped += batch.length;
    }
  }

  return { indexed, skipped };
}

/** Reindekserer én enkelt kilde. Kalles når en LegalReference/RoutineTemplate/DocumentTemplate opprettes/endres. */
export async function reindexSingleSource(
  sourceType: AiKnowledgeSourceType,
  sourceId: string,
): Promise<void> {
  let content = "";

  if (sourceType === "LEGAL_REFERENCE") {
    const ref = await prisma.legalReference.findUnique({ where: { id: sourceId } });
    if (ref) content = buildLegalReferenceContent(ref);
  } else if (sourceType === "ROUTINE_TEMPLATE") {
    const tpl = await prisma.routineTemplate.findUnique({ where: { id: sourceId } });
    if (tpl) content = buildRoutineTemplateContent(tpl);
  } else if (sourceType === "DOCUMENT_TEMPLATE") {
    const tpl = await prisma.documentTemplate.findUnique({ where: { id: sourceId } });
    if (tpl) content = buildDocumentTemplateContent(tpl);
  }

  if (!content) return;

  content = content.slice(0, MAX_CHUNK_CHARS);
  const [embedding] = await embedTexts([content]);
  if (!embedding) return;

  await prisma.aiKnowledgeChunk.upsert({
    where: { sourceType_sourceId: { sourceType, sourceId } },
    create: { sourceType, sourceId, content, embedding, model: EMBEDDING_MODEL },
    update: { content, embedding, model: EMBEDDING_MODEL },
  });
}

export interface RelevantContextResult {
  content: string;
  sourceType: AiKnowledgeSourceType;
  sourceId: string;
  similarity: number;
}

/**
 * Henter de mest relevante kunnskapsbitene (RAG) for en gitt forespørsel.
 * Feiler "trygt" (tom liste) hvis embeddings ikke er tilgjengelig - AI-forslaget
 * skal fortsatt fungere uten RAG-kontekst, bare mindre presist.
 */
export async function retrieveRelevantContext(
  query: string,
  topK: number = 5,
): Promise<RelevantContextResult[]> {
  try {
    const [queryEmbedding, chunks] = await Promise.all([
      embedText(query),
      prisma.aiKnowledgeChunk.findMany(),
    ]);

    if (queryEmbedding.length === 0 || chunks.length === 0) return [];

    return chunks
      .map((chunk) => ({
        content: chunk.content,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding as unknown as number[]),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (error) {
    console.error("Kunne ikke hente kontekst fra AI-kunnskapsbasen:", error);
    return [];
  }
}

/** Bygger en systemprompt-vennlig kontekststreng fra relevante kunnskapsbiter. Tom streng hvis ingen treff. */
export function formatContextForPrompt(results: RelevantContextResult[]): string {
  if (results.length === 0) return "";
  const sections = results.map((r, idx) => `[${idx + 1}] ${r.content}`);
  return `Relevant HMS-kunnskap (lovtekst og rutinemaler fra HMS Nova sitt kunnskapsgrunnlag) - bruk dette som faglig støtte der det er relevant:\n\n${sections.join("\n\n")}`;
}
