"use server";

import archiver from "archiver";
import ExcelJS from "exceljs";
import { PassThrough } from "stream";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { AuditLog } from "@/lib/audit-log";
import { getStorage, generateFileKey } from "@/lib/storage";

/**
 * Selvbetjent GDPR-dataeksport (art. 20 – dataportabilitet) og exit-strategi:
 * kunden skal selv kunne laste ned alt sitt innhold uten å kontakte support.
 */

const EXPORT_URL_TTL_SECONDS = 15 * 60; // 15 min – kortlevd signert nedlastingslenke

async function requireAdmin() {
  const { userId, tenantId } = await getRequiredTenantContext();

  const userTenant = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });

  if (!userTenant || userTenant.role !== "ADMIN") {
    throw new Error("Kun administratorer kan eksportere all bedriftsdata");
  }

  return { userId, tenantId };
}

function addSheet<T extends Record<string, unknown>>(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: { header: string; key: string; width?: number }[],
  rows: T[],
) {
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8F0FE" },
  };
  for (const row of rows) {
    sheet.addRow(row);
  }
  return sheet;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toLocaleDateString("nb-NO");
}

async function buildIncidentsWorkbook(tenantId: string): Promise<Buffer> {
  const incidents = await prisma.incident.findMany({
    where: { tenantId },
    orderBy: { occurredAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Avvik og hendelser",
    [
      { header: "Avviksnummer", key: "avviksnummer", width: 16 },
      { header: "Type", key: "type", width: 16 },
      { header: "Tittel", key: "title", width: 30 },
      { header: "Beskrivelse", key: "description", width: 40 },
      { header: "Alvorlighetsgrad", key: "severity", width: 14 },
      { header: "Hendelsesdato", key: "occurredAt", width: 16 },
      { header: "Sted", key: "location", width: 20 },
      { header: "Status", key: "status", width: 14 },
      { header: "Umiddelbare tiltak", key: "immediateAction", width: 30 },
      { header: "Årsak", key: "rootCause", width: 30 },
      { header: "Læringspunkter", key: "lessonsLearned", width: 30 },
      { header: "Meldt til myndighet", key: "reportedToAuthorityAt", width: 18 },
      { header: "Opprettet", key: "createdAt", width: 16 },
    ],
    incidents.map((i) => ({
      avviksnummer: i.avviksnummer ?? "",
      type: i.type,
      title: i.title,
      description: i.description,
      severity: i.severity ?? "",
      occurredAt: formatDate(i.occurredAt),
      location: i.location ?? "",
      status: i.status,
      immediateAction: i.immediateAction ?? "",
      rootCause: i.rootCause ?? "",
      lessonsLearned: i.lessonsLearned ?? "",
      reportedToAuthorityAt: formatDate(i.reportedToAuthorityAt),
      createdAt: formatDate(i.createdAt),
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function buildRiskWorkbook(tenantId: string): Promise<Buffer> {
  const [assessments, risks] = await Promise.all([
    prisma.riskAssessment.findMany({ where: { tenantId }, orderBy: { assessmentYear: "desc" } }),
    prisma.risk.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Risikovurderinger",
    [
      { header: "Tittel", key: "title", width: 30 },
      { header: "År", key: "assessmentYear", width: 10 },
      { header: "Deltakere", key: "participants", width: 30 },
      { header: "Godkjent", key: "approvedAt", width: 16 },
      { header: "Sist gjennomgått", key: "reviewedAt", width: 16 },
    ],
    assessments.map((a) => ({
      title: a.title,
      assessmentYear: a.assessmentYear,
      participants: a.participants ?? "",
      approvedAt: formatDate(a.approvedAt),
      reviewedAt: formatDate(a.reviewedAt),
    })),
  );

  addSheet(
    workbook,
    "Risikoelementer",
    [
      { header: "Tittel", key: "title", width: 30 },
      { header: "Kontekst", key: "context", width: 40 },
      { header: "Sannsynlighet", key: "likelihood", width: 14 },
      { header: "Konsekvens", key: "consequence", width: 14 },
      { header: "Score", key: "score", width: 10 },
      { header: "Kategori", key: "category", width: 16 },
      { header: "Status", key: "status", width: 14 },
      { header: "Eksisterende tiltak", key: "existingControls", width: 30 },
      { header: "Sted", key: "location", width: 20 },
      { header: "Neste gjennomgang", key: "nextReviewDate", width: 18 },
    ],
    risks.map((r) => ({
      title: r.title,
      context: r.context,
      likelihood: r.likelihood,
      consequence: r.consequence,
      score: r.score,
      category: r.category,
      status: r.status,
      existingControls: r.existingControls ?? "",
      location: r.location ?? "",
      nextReviewDate: formatDate(r.nextReviewDate),
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function buildMeasuresWorkbook(tenantId: string): Promise<Buffer> {
  const measures = await prisma.measure.findMany({
    where: { tenantId },
    orderBy: { dueAt: "desc" },
    include: { responsible: { select: { name: true, email: true } } },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Tiltak",
    [
      { header: "Tittel", key: "title", width: 30 },
      { header: "Beskrivelse", key: "description", width: 40 },
      { header: "Frist", key: "dueAt", width: 16 },
      { header: "Ansvarlig", key: "responsible", width: 24 },
      { header: "Status", key: "status", width: 14 },
      { header: "Kategori", key: "category", width: 16 },
      { header: "Fullført", key: "completedAt", width: 16 },
      { header: "Effekt", key: "effectiveness", width: 18 },
    ],
    measures.map((m) => ({
      title: m.title,
      description: m.description ?? "",
      dueAt: formatDate(m.dueAt),
      responsible: m.responsible?.name ?? m.responsible?.email ?? "",
      status: m.status,
      category: m.category,
      completedAt: formatDate(m.completedAt),
      effectiveness: m.effectiveness,
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function buildRoutinesWorkbook(tenantId: string): Promise<Buffer> {
  const routines = await prisma.routine.findMany({
    where: { tenantId },
    orderBy: { title: "asc" },
    include: { responsibleUser: { select: { name: true, email: true } } },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Rutiner",
    [
      { header: "Tittel", key: "title", width: 30 },
      { header: "Beskrivelse", key: "description", width: 40 },
      { header: "Kategori", key: "category", width: 18 },
      { header: "Lovhjemmel", key: "legalReference", width: 24 },
      { header: "Status", key: "status", width: 14 },
      { header: "Ansvarlig", key: "responsible", width: 24 },
      { header: "Neste gjennomgang", key: "nextReviewAt", width: 18 },
      { header: "Sist revidert", key: "lastReviewedAt", width: 16 },
    ],
    routines.map((r) => ({
      title: r.title,
      description: r.description ?? "",
      category: r.category ?? "",
      legalReference: r.legalReference ?? "",
      status: r.status,
      responsible: r.responsibleUser?.name ?? r.responsibleUser?.email ?? "",
      nextReviewAt: formatDate(r.nextReviewAt),
      lastReviewedAt: formatDate(r.lastReviewedAt),
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

interface DocumentFileEntry {
  archivePath: string;
  buffer: Buffer;
}

async function buildDocumentsWorkbookAndFiles(
  tenantId: string,
): Promise<{ workbook: Buffer; files: DocumentFileEntry[] }> {
  const documents = await prisma.document.findMany({
    where: { tenantId },
    orderBy: { title: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HMS Nova";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Dokumenter",
    [
      { header: "Tittel", key: "title", width: 34 },
      { header: "Type", key: "kind", width: 14 },
      { header: "Versjon", key: "version", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Godkjent", key: "approvedAt", width: 16 },
      { header: "Neste gjennomgang", key: "nextReviewDate", width: 18 },
      { header: "Filnavn i mappen 'dokumenter'", key: "filename", width: 40 },
    ],
    documents.map((d) => ({
      title: d.title,
      kind: d.kind,
      version: d.version,
      status: d.status,
      approvedAt: formatDate(d.approvedAt),
      nextReviewDate: formatDate(d.nextReviewDate),
      filename: `${sanitizeFilename(d.title)}${fileExtFromMime(d.mime)}`,
    })),
  );

  const storage = getStorage();
  const files: DocumentFileEntry[] = [];

  for (const doc of documents) {
    try {
      const fileBuffer = await storage.get(doc.fileKey);
      if (fileBuffer) {
        files.push({
          archivePath: `dokumenter/${sanitizeFilename(doc.title)}${fileExtFromMime(doc.mime)}`,
          buffer: fileBuffer,
        });
      }
    } catch {
      // Enkeltfil kan mangle i storage – hopp over, resten av eksporten skal ikke feile
    }
  }

  return { workbook: Buffer.from(await workbook.xlsx.writeBuffer()), files };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9æøåÆØÅ _-]/g, "").trim().slice(0, 80) || "dokument";
}

function fileExtFromMime(mime: string): string {
  if (mime.includes("wordprocessingml")) return ".docx";
  if (mime.includes("spreadsheetml")) return ".xlsx";
  if (mime.includes("pdf")) return ".pdf";
  return "";
}

function buildReadmeText(tenantName: string): string {
  return `HMS Nova – full dataeksport
Bedrift: ${tenantName}
Generert: ${new Date().toLocaleString("nb-NO")}

Innhold:
- avvik-og-hendelser.xlsx – alle registrerte avvik, RUH og ulykker
- risikovurderinger.xlsx – risikovurderinger og risikoelementer
- tiltak.xlsx – alle tiltak (korrigerende/forebyggende)
- rutiner.xlsx – HMS-håndbokens rutiner
- dokumenter.xlsx – oversikt over alle dokumenter, med selve filene i mappen "dokumenter/"

Denne eksporten er generert av administrator i HMS Nova og er ment for GDPR-dataportabilitet
(personvernforordningen art. 20) og som grunnlag ved bytte av leverandør (exit-strategi).
`;
}

async function buildZipBuffer(entries: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);
    archive.on("error", reject);

    archive.pipe(passthrough);
    for (const entry of entries) {
      archive.append(entry.buffer, { name: entry.name });
    }
    archive.finalize();
  });
}

export async function exportTenantData(): Promise<
  | { success: true; data: { url: string; filename: string; expiresInSeconds: number } }
  | { success: false; error: string }
> {
  try {
    const { userId, tenantId } = await requireAdmin();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    if (!tenant) {
      return { success: false, error: "Fant ikke bedriften" };
    }

    const [incidentsXlsx, riskXlsx, measuresXlsx, routinesXlsx, documentsResult] = await Promise.all([
      buildIncidentsWorkbook(tenantId),
      buildRiskWorkbook(tenantId),
      buildMeasuresWorkbook(tenantId),
      buildRoutinesWorkbook(tenantId),
      buildDocumentsWorkbookAndFiles(tenantId),
    ]);

    const zipEntries: { name: string; buffer: Buffer }[] = [
      { name: "les-meg.txt", buffer: Buffer.from(buildReadmeText(tenant.name), "utf-8") },
      { name: "avvik-og-hendelser.xlsx", buffer: incidentsXlsx },
      { name: "risikovurderinger.xlsx", buffer: riskXlsx },
      { name: "tiltak.xlsx", buffer: measuresXlsx },
      { name: "rutiner.xlsx", buffer: routinesXlsx },
      { name: "dokumenter.xlsx", buffer: documentsResult.workbook },
      ...documentsResult.files.map((f) => ({ name: f.archivePath, buffer: f.buffer })),
    ];

    const zipBuffer = await buildZipBuffer(zipEntries);

    const now = new Date();
    const filename = `HMS-Nova-eksport-${tenant.name.replace(/[^a-zA-Z0-9]/g, "-")}-${now.toISOString().slice(0, 10)}.zip`;
    const storage = getStorage();
    const key = generateFileKey(tenantId, "exports", filename);
    await storage.upload(key, zipBuffer);
    const url = await storage.getUrl(key, EXPORT_URL_TTL_SECONDS);

    await AuditLog.log(tenantId, userId, "DATA_EXPORT_CREATED", "Tenant", tenantId, {
      filename,
      fileCount: zipEntries.length,
      documentFilesIncluded: documentsResult.files.length,
    });

    return {
      success: true,
      data: { url, filename, expiresInSeconds: EXPORT_URL_TTL_SECONDS },
    };
  } catch (error: any) {
    console.error("Export tenant data error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke eksportere bedriftsdata",
    };
  }
}
