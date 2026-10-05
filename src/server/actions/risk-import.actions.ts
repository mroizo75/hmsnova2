"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { RiskCategory } from "@prisma/client";
import { AuditLog } from "@/lib/audit-log";
import { generateAIResponse } from "@/lib/ai";
import { convertDocumentToPDF, extractTextFromPDF } from "@/lib/adobe-pdf";
import { prisma } from "@/lib/db";
import {
  validateDocumentFile,
  validateFileSize,
} from "@/lib/file-validation";
import { getAuthContext } from "@/lib/server-authorization";
import { generateFileKey, getStorage } from "@/lib/storage";
import {
  confirmRiskImportSchema,
  parseRiskImportResponse,
  type ConfirmRiskImportInput,
} from "@/features/risks/lib/risk-import";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { checkRateLimitPolicy } from "@/lib/rate-limit";

const PDF_MIME = "application/pdf";
const DOC_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function fail(message: string) {
  return { success: false as const, error: message };
}

async function extractSpreadsheetText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const lines: string[] = [];
  for (const sheet of workbook.worksheets.slice(0, 10)) {
    lines.push(`ARK: ${sheet.name}`);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        values[columnNumber - 1] = cell.text.trim();
      });
      lines.push(values.join("\t"));
    });
  }
  return lines.join("\n");
}

async function extractImportText(buffer: Buffer, mimeType: string) {
  if (mimeType === XLSX_MIME) {
    return extractSpreadsheetText(buffer);
  }
  if (mimeType === PDF_MIME) {
    return extractTextFromPDF(buffer);
  }
  if (DOC_MIMES.has(mimeType)) {
    const pdf = await convertDocumentToPDF(buffer, mimeType);
    return extractTextFromPDF(pdf);
  }
  throw new Error("Filtypen støttes ikke. Bruk PDF, Word eller Excel (.xlsx).");
}

export async function previewRiskAssessmentImport(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canCreateRisks) {
    return fail("Ikke autorisert til å importere risikovurderinger");
  }
  const rateLimit = await checkRateLimitPolicy({
    policy: "expensiveOperation",
    scope: "risk-assessment-import",
    identifiers: [auth.userId, auth.tenantId],
    failClosed: true,
  });
  if (!rateLimit.success) {
    return fail("For mange importforsøk. Prøv igjen senere.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Velg en fil som skal importeres");
  }
  const sizeValidation = validateFileSize(file.size, 15);
  if (!sizeValidation.isValid) {
    return fail(sizeValidation.error ?? "Ugyldig filstørrelse");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = await validateDocumentFile(buffer);
  if (!validation.isValid || !validation.detectedType) {
    return fail(validation.error ?? "Ugyldig dokument");
  }
  if (validation.detectedType === "application/vnd.ms-excel") {
    return fail("Eldre .xls-filer støttes ikke. Lagre filen som .xlsx og prøv igjen.");
  }

  const storage = getStorage();
  const fileKey = generateFileKey(
    auth.tenantId,
    "risk-assessments/imports",
    file.name,
  );

  try {
    await storage.upload(fileKey, buffer, {
      tenantId: auth.tenantId,
      uploadedById: auth.userId,
    });
    const extractedText = await extractImportText(buffer, validation.detectedType);
    if (extractedText.trim().length < 20) {
      throw new Error("Dokumentet inneholder for lite lesbar tekst");
    }

    const response = await generateAIResponse(
      `Tolk dokumentet som en eksisterende risikovurdering. Returner KUN ett JSON-objekt:
{
  "title": "dokumentets tittel",
  "assessmentYear": 2026,
  "participants": "navn/roller eller null",
  "rows": [{
    "title": "kort risikotittel",
    "context": "aktivitet/fare og sammenheng",
    "description": "utdyping eller null",
    "riskStatement": "mulig konsekvens eller null",
    "likelihood": 1,
    "consequence": 1,
    "category": "SAFETY",
    "existingControls": "eksisterende tiltak eller null",
    "measures": ["foreslåtte/planlagte tiltak"],
    "confidence": 0.8,
    "missingFields": ["felt som ikke fremgår"]
  }]
}
Tillatte category-verdier: ${Object.values(RiskCategory).join(", ")}.
Sannsynlighet og konsekvens skal være heltall 1–5. Ikke dikt opp manglende informasjon:
marker den i missingFields, bruk null for valgfri tekst og 1 for ukjent tallverdi.
AI-resultatet er kun et utkast som skal verifiseres av et menneske.

DOKUMENT:
${extractedText.slice(0, 60_000)}`,
      "gpt-4o-mini",
      {
        tenantId: auth.tenantId,
        cacheScope: `risk-import:${auth.tenantId}`,
        rateLimitScope: `risk-import:${auth.tenantId}`,
        budgetScope: auth.tenantId,
        systemPrompt:
          "Du strukturerer eksisterende norske risikovurderinger uten å legge til fakta som ikke finnes i dokumentet. Returner bare gyldig JSON.",
      },
    );
    const preview = parseRiskImportResponse(response);

    return {
      success: true as const,
      data: {
        ...preview,
        fileKey,
        fileName: file.name,
        mimeType: validation.detectedType,
      },
    };
  } catch (error) {
    await storage.delete(fileKey).catch(() => undefined);
    return fail(
      error instanceof Error
        ? error.message
        : "Kunne ikke tolke risikovurderingen",
    );
  }
}

export async function confirmRiskAssessmentImport(
  input: ConfirmRiskImportInput,
) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canCreateRisks) {
    return fail("Ikke autorisert til å importere risikovurderinger");
  }

  const parsed = confirmRiskImportSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Ugyldige importdata");
  }
  const validated = parsed.data;
  const requiredPrefix = `${auth.tenantId}/risk-assessments/imports/`;
  if (!validated.fileKey.startsWith(requiredPrefix)) {
    return fail("Originalfilen tilhører ikke bedriften");
  }

  const owner = await prisma.userTenant.findFirst({
    where: { tenantId: auth.tenantId, userId: validated.ownerId },
    select: { userId: true },
  });
  if (!owner) {
    return fail("Valgt risikoeier tilhører ikke bedriften");
  }
  const originalFile = await getStorage().get(validated.fileKey);
  if (!originalFile) {
    return fail("Originalfilen finnes ikke lenger");
  }

  const now = new Date();
  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + 30);

  const assessment = await prisma.$transaction(async (tx) => {
    const created = await tx.riskAssessment.create({
      data: {
        tenantId: auth.tenantId,
        title: validated.title,
        assessmentYear: validated.assessmentYear,
        participants: validated.participants,
        importSourceFileKey: validated.fileKey,
        importSourceFileName: validated.fileName,
        importSourceMimeType: validated.mimeType,
        importedAt: now,
        importedById: auth.userId,
        createdBy: auth.userId,
      },
    });

    for (const row of validated.rows) {
      const risk = await tx.risk.create({
        data: {
          tenantId: auth.tenantId,
          riskAssessmentId: created.id,
          title: row.title,
          context: row.context,
          description: row.description,
          riskStatement: row.riskStatement,
          likelihood: row.likelihood,
          consequence: row.consequence,
          score: row.likelihood * row.consequence,
          category: row.category,
          existingControls: row.existingControls,
          ownerId: validated.ownerId,
          assessmentDate: now,
          createdBy: auth.userId,
        },
      });
      if (row.measures.length > 0) {
        await tx.measure.createMany({
          data: row.measures.map((title) => ({
            tenantId: auth.tenantId,
            riskId: risk.id,
            title,
            dueAt,
            responsibleId: validated.ownerId,
          })),
        });
      }
    }
    return created;
  });

  AuditLog.log(
    auth.tenantId,
    auth.userId,
    "RISK_ASSESSMENT_IMPORTED",
    "RiskAssessment",
    assessment.id,
    { fileName: validated.fileName, rowCount: validated.rows.length },
  ).catch(() => undefined);
  revalidatePath("/dashboard/risks");
  revalidatePath(`/dashboard/risks/assessment/${assessment.id}`);
  triggerRealtimeEvent(auth.tenantId, "risk-updated");

  return { success: true as const, data: { id: assessment.id } };
}
