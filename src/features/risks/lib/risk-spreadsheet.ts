import ExcelJS from "exceljs";
import { RiskCategory } from "@prisma/client";
import {
  riskImportPreviewSchema,
  type RiskImportPreview,
} from "@/features/risks/lib/risk-import";

const MAX_SHEETS = 10;
const MAX_ROWS = 500;
const MAX_COLUMNS = 80;

type ColumnRole =
  | "activity"
  | "title"
  | "cause"
  | "riskStatement"
  | "likelihood"
  | "consequence"
  | "existingControls"
  | "measures"
  | "category"
  | "responsible";

export type SpreadsheetGrid = {
  name: string;
  rows: string[][];
};

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cellValueToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  if (typeof value !== "object") return "";

  const typed = value as {
    text?: unknown;
    result?: unknown;
    richText?: Array<{ text?: unknown } | null> | null;
    formula?: unknown;
    error?: unknown;
  };

  if (Array.isArray(typed.richText)) {
    return typed.richText
      .map((part) => (part && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  if ("result" in typed || typeof typed.formula === "string") {
    return cellValueToText(typed.result);
  }
  if (typeof typed.text === "string" || typeof typed.text === "number") {
    return String(typed.text).trim();
  }
  if (typed.error != null) return "";
  return "";
}

export function sheetRowsFromWorkbook(workbook: ExcelJS.Workbook): SpreadsheetGrid[] {
  return workbook.worksheets.slice(0, MAX_SHEETS).map((sheet) => {
    const rows: string[][] = [];
    const lastRow = Math.min(sheet.rowCount || 0, MAX_ROWS);
    for (let rowNumber = 1; rowNumber <= lastRow; rowNumber += 1) {
      const cells: string[] = [];
      sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        if (columnNumber > MAX_COLUMNS) return;
        cells[columnNumber - 1] = cellValueToText(cell.value);
      });
      if (cells.some((cell) => cell && cell.trim())) rows.push(cells);
    }
    return { name: sheet.name, rows };
  });
}

export function spreadsheetToText(sheets: SpreadsheetGrid[]): string {
  return sheets
    .map((sheet) => [`ARK: ${sheet.name}`, ...sheet.rows.map((row) => row.join("\t"))].join("\n"))
    .join("\n");
}

function classifyHeader(header: string): { role: ColumnRole; rank: number } | null {
  const text = normalizeHeader(header);
  if (!text) return null;
  const after = /\better\b/.test(text);
  const before = /\bfor\b|\bna\b|\bnavaerende\b|\binit/.test(text);
  const rank = (before ? 2 : 0) - (after ? 3 : 0);

  if (/beskrivelse|tekst|mulig konsekvens|konsekvens av|skade/.test(text) && /konsekvens|skade|hendelse/.test(text)) {
    return { role: "riskStatement", rank };
  }
  if (
    (/^k$|^k\b|konsekvensgrad|\bkonsekvens\b|\brisiko k\b/.test(text)) &&
    !/beskrivelse|tekst|mulig|kommentar/.test(text)
  ) {
    return { role: "consequence", rank };
  }
  if (
    /^s$|^s\b|sannsynlighetsgrad|\bsannsynlighet\b|\blikelihood\b|\bprobability\b|\brisiko s\b/.test(text) &&
    !/status|beskriv/.test(text)
  ) {
    return { role: "likelihood", rank };
  }
  if (/eksisterende tiltak|navarende tiltak|gjeldende tiltak|barrier/.test(text)) {
    return { role: "existingControls", rank };
  }
  if (/nye tiltak|foreslatt|planlagt|ytterligere|risikoreduser|tiltak etter|anbefalt tiltak|^tiltak$/.test(text)) {
    return { role: "measures", rank };
  }
  if (/uonsket hendelse|^fare$|farekilde|risikobeskrivelse|\bfare\b/.test(text)) {
    return { role: "title", rank };
  }
  if (/aktivitet|arbeidsoperasjon|arbeidsoppgave|omrade|prosess/.test(text)) {
    return { role: "activity", rank };
  }
  if (/^arsak$|\barsak\b|kilde/.test(text)) return { role: "cause", rank };
  if (/^kategori$|^type$|^omrade$/.test(text)) return { role: "category", rank };
  if (/ansvarlig|eier|risk owner/.test(text)) return { role: "responsible", rank };
  return null;
}

const SCALE_WORDS: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  "svaert lav": 1,
  ubetydelig: 1,
  sjelden: 1,
  usannsynlig: 1,
  lav: 2,
  liten: 2,
  mindre: 2,
  middels: 3,
  moderat: 3,
  mulig: 3,
  hoy: 4,
  stor: 4,
  sannsynlig: 4,
  alvorlig: 4,
  "svaert hoy": 5,
  kritisk: 5,
  katastrofal: 5,
  "nesten sikker": 5,
};

function parseScale(raw: string): number | null {
  const text = normalizeHeader(raw);
  if (!text) return null;
  if (SCALE_WORDS[text] != null) return SCALE_WORDS[text];
  const leading = text.match(/^([1-5])\b/)?.[1];
  if (leading) return Number(leading);
  const numeric = Number(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 1 && numeric <= 5) return Math.round(numeric);
  if (numeric > 5 && numeric <= 10) return Math.max(1, Math.min(5, Math.round(numeric / 2)));
  return null;
}

function mapCategory(raw: string): RiskCategory | null {
  const text = normalizeHeader(raw);
  if (!text) return null;
  if (/psykosos/.test(text)) return RiskCategory.PSYCHOSOCIAL;
  if (/ergonom/.test(text)) return RiskCategory.ERGONOMIC;
  if (/organisator/.test(text)) return RiskCategory.ORGANISATIONAL;
  if (/fysisk/.test(text)) return RiskCategory.PHYSICAL;
  if (/miljo/.test(text)) return RiskCategory.ENVIRONMENTAL;
  if (/helse/.test(text)) return RiskCategory.HEALTH;
  if (/jurid|lov|personvern/.test(text)) return RiskCategory.LEGAL;
  if (/informasjon|ikt|sikkerhetssystem/.test(text)) return RiskCategory.INFORMATION_SECURITY;
  if (/strateg/.test(text)) return RiskCategory.STRATEGIC;
  if (/sikker|ulykke|hms/.test(text)) return RiskCategory.SAFETY;
  if (/operasjon|drift/.test(text)) return RiskCategory.OPERATIONAL;
  return null;
}

function splitMeasures(raw: string): string[] {
  return raw
    .split(/\r?\n|;|•|·|(?:^|\s)\d+[.)]\s/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 10);
}

function findYear(texts: string[], fallback: number): number {
  for (const text of texts) {
    const match = text.match(/\b(20\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return fallback >= 2000 && fallback <= 2100 ? fallback : 2026;
}

function titleFromFileName(fileName: string | undefined, sheetName: string): string {
  const base = (fileName ?? sheetName)
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.length >= 3 ? base.slice(0, 200) : "Importert risikovurdering";
}

function headerScore(row: string[]): number {
  return row.reduce((score, cell) => score + (classifyHeader(cell ?? "") ? 1 : 0), 0);
}

function pickColumns(header: string[]): Map<number, { role: ColumnRole; rank: number }> {
  const best = new Map<ColumnRole, { index: number; rank: number }>();
  header.forEach((cell, index) => {
    const classified = classifyHeader(cell ?? "");
    if (!classified) return;
    const current = best.get(classified.role);
    if (!current || classified.rank > current.rank) {
      best.set(classified.role, { index, rank: classified.rank });
    }
  });
  const columns = new Map<number, { role: ColumnRole; rank: number }>();
  for (const [role, chosen] of best) {
    columns.set(chosen.index, { role, rank: chosen.rank });
  }
  return columns;
}

function cellAt(row: string[], index: number | undefined): string {
  if (index == null) return "";
  return (row[index] ?? "").trim();
}

function parseSheet(
  sheet: SpreadsheetGrid,
  fileName: string | undefined,
): RiskImportPreview | null {
  let headerIndex = -1;
  let bestScore = 0;
  const scanLimit = Math.min(sheet.rows.length, 25);
  for (let index = 0; index < scanLimit; index += 1) {
    const score = headerScore(sheet.rows[index] ?? []);
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  }
  if (headerIndex < 0 || bestScore < 2) return null;

  const header = sheet.rows[headerIndex] ?? [];
  const columns = pickColumns(header);
  const roles = new Set([...columns.values()].map((column) => column.role));
  if (!roles.has("likelihood") && !roles.has("consequence")) return null;
  if (!roles.has("title") && !roles.has("activity") && !roles.has("riskStatement")) return null;

  const indexOf = (role: ColumnRole) =>
    [...columns.entries()].find(([, column]) => column.role === role)?.[0];

  const preamble = sheet.rows.slice(0, headerIndex).flat().filter(Boolean);
  const participants = preamble.find((cell) => /deltak/i.test(cell)) ?? null;
  const year = findYear(
    [fileName ?? "", sheet.name, ...preamble],
    new Date().getFullYear(),
  );

  const rows = sheet.rows.slice(headerIndex + 1).flatMap((row) => {
    const title = cellAt(row, indexOf("title")) || cellAt(row, indexOf("activity"));
    const activity = cellAt(row, indexOf("activity"));
    const cause = cellAt(row, indexOf("cause"));
    const statement = cellAt(row, indexOf("riskStatement"));
    const controls = cellAt(row, indexOf("existingControls"));
    const measureText = cellAt(row, indexOf("measures"));
    const categoryText = cellAt(row, indexOf("category"));
    const responsible = cellAt(row, indexOf("responsible"));
    const likelihoodRaw = cellAt(row, indexOf("likelihood"));
    const consequenceRaw = cellAt(row, indexOf("consequence"));
    if (!title && !activity && !statement && !likelihoodRaw && !consequenceRaw) return [];
    if (headerScore(row) >= bestScore) return [];

    const hazard = title || statement || activity;
    if (hazard.trim().length < 3) return [];

    const context = [activity && activity !== hazard ? activity : "", cause, statement && statement !== hazard ? statement : ""]
      .filter(Boolean)
      .join(". ") || hazard;

    const missingFields: string[] = [];
    const likelihood = parseScale(likelihoodRaw);
    const consequence = parseScale(consequenceRaw);
    if (likelihood == null) missingFields.push("sannsynlighet");
    if (consequence == null) missingFields.push("konsekvens");
    const category = mapCategory(categoryText);
    if (!category) missingFields.push("kategori");

    const description = responsible ? `Ansvarlig i kilden: ${responsible}` : null;

    return [{
      title: hazard.slice(0, 500),
      context: context.slice(0, 4000),
      description: description?.slice(0, 2000) ?? null,
      riskStatement: statement && statement !== hazard ? statement.slice(0, 500) : null,
      likelihood: likelihood ?? 1,
      consequence: consequence ?? 1,
      category: category ?? RiskCategory.SAFETY,
      existingControls: controls ? controls.slice(0, 2000) : null,
      measures: splitMeasures(measureText),
      confidence: likelihood != null && consequence != null ? 0.9 : 0.4,
      missingFields,
    }];
  });

  if (rows.length === 0) return null;

  const preview = riskImportPreviewSchema.safeParse({
    title: titleFromFileName(fileName, sheet.name),
    assessmentYear: year,
    participants: participants ? participants.slice(0, 2000) : null,
    rows: rows.slice(0, 200),
  });
  return preview.success ? preview.data : null;
}

export function parseRiskSpreadsheet(
  sheets: SpreadsheetGrid[],
  options?: { fileName?: string },
): RiskImportPreview | null {
  const parsed = sheets
    .map((sheet) => parseSheet(sheet, options?.fileName))
    .filter((sheet): sheet is RiskImportPreview => sheet !== null)
    .sort((a, b) => b.rows.length - a.rows.length);
  return parsed[0] ?? null;
}
