import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getWeek,
} from "date-fns";
import { nb } from "date-fns/locale";
import { getPermissions } from "@/lib/permissions";

// ── Hjelpefunksjoner ──────────────────────────────────────────────────────────

function getDisplayName(
  user: { name: string | null; email: string },
  userTenant: { displayName: string | null } | null
): string {
  return userTenant?.displayName?.trim() || user.name?.trim() || user.email;
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatFieldValue(
  fieldType: string,
  optionsJson: string | null,
  rawValue: string | null,
  fileKey: string | null
): string {
  if (fileKey) return `[Fil vedlagt]`;
  if (!rawValue) return "";

  switch (fieldType) {
    case "CHECKBOX": {
      const options = parseJsonArray(optionsJson);
      if (options.length > 0) {
        const selected = parseJsonArray(rawValue);
        return selected.join(", ");
      }
      return rawValue === "true" ? "Ja" : "Nei";
    }
    case "LIKERT_SCALE": {
      const labels: Record<string, string> = {
        "1": "1 – Svært uenig",
        "2": "2 – Uenig",
        "3": "3 – Nøytral",
        "4": "4 – Enig",
        "5": "5 – Svært enig",
      };
      return labels[rawValue] ?? rawValue;
    }
    case "DATE": {
      try {
        return new Date(rawValue).toLocaleDateString("nb-NO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } catch {
        return rawValue;
      }
    }
    case "DATETIME": {
      try {
        return new Date(rawValue).toLocaleString("nb-NO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return rawValue;
      }
    }
    default:
      return rawValue;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Kladd",
    SUBMITTED: "Innsendt",
    APPROVED: "Godkjent",
    REJECTED: "Avvist",
  };
  return labels[status] || status;
}

function getDateFilter(
  period: string | null,
  year: string | null,
  month: string | null,
  week: string | null
): { from: Date; to: Date } | null {
  const now = new Date();

  if (period === "week" || week) {
    const w = week ? parseInt(week, 10) : getWeek(now, { weekStartsOn: 1, locale: nb });
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const from = startOfWeek(new Date(y, 0, (w - 1) * 7 + 1), { weekStartsOn: 1, locale: nb });
    const to = endOfWeek(from, { weekStartsOn: 1, locale: nb });
    return { from, to };
  }

  if (period === "month" || month) {
    const m = month ? parseInt(month, 10) - 1 : now.getMonth();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const from = startOfMonth(new Date(y, m, 1));
    const to = endOfMonth(from);
    return { from, to };
  }

  if (period === "year" || year) {
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const from = startOfYear(new Date(y, 0, 1));
    const to = endOfYear(from);
    return { from, to };
  }

  return null;
}

// ── Rute ─────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
      },
      select: { role: true },
    });
    const permissions = getPermissions(userTenant?.role ?? "ANSATT");

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const week = searchParams.get("week");

    const form = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { order: "asc" } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Skjema ikke funnet" }, { status: 404 });
    }

    const canAccess = form.tenantId === session.user.tenantId || form.isGlobal === true;
    if (!canAccess) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    const restrictedGlobalView = form.isGlobal && !permissions.canManageForms;

    const dateFilter = getDateFilter(period, year, month, week);

    const submissions = await prisma.formSubmission.findMany({
      where: {
        formTemplateId: id,
        tenantId: session.user.tenantId,
        ...(restrictedGlobalView ? { submittedById: session.user.id } : {}),
        ...(dateFilter && {
          createdAt: { gte: dateFilter.from, lte: dateFilter.to },
        }),
      },
      include: {
        fieldValues: true,
        submittedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Hent visningsnavn fra UserTenant
    const submittedByIds = [
      ...new Set(submissions.map((s) => s.submittedById).filter((id): id is string => id != null)),
    ];
    const userTenants = await prisma.userTenant.findMany({
      where: { userId: { in: submittedByIds }, tenantId: session.user.tenantId },
      select: { userId: true, displayName: true },
    });
    const displayNameMap = new Map(userTenants.map((ut) => [ut.userId, ut.displayName]));

    // Filtrer bort SECTION_HEADER – de er ikke reelle svar-felt
    const answerFields = form.fields.filter((f) => f.fieldType !== "SECTION_HEADER");

    // ── Bygg arbeidsbok ───────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HMS Nova";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Svar");

    const baseHeaders = ["Referanse", "Utfylt av", "Dato", "Status"];
    const fieldHeaders = answerFields.map((f) => f.label);
    const allHeaders = [...baseHeaders, ...fieldHeaders];

    // Definer kolonner
    worksheet.columns = allHeaders.map((header, idx) => ({
      header,
      key: `col_${idx}`,
      width: Math.min(Math.max(header.length + 4, 14), 50),
    }));

    // Header-rad formatering
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF006428" }, // HMS Nova grønn
    };
    headerRow.alignment = { vertical: "middle", wrapText: false };
    headerRow.height = 20;

    // Legg til frys på øverste rad
    worksheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0, activeCell: "A2" }];

    // ── Datarader ─────────────────────────────────────────
    for (const submission of submissions) {
      const displayName =
        submission.submittedById == null
          ? "Anonym"
          : getDisplayName(submission.submittedBy!, {
              displayName: displayNameMap.get(submission.submittedById) ?? null,
            });

      const rowData: (string | number)[] = [
        submission.submissionNumber || "",
        displayName,
        new Date(submission.createdAt).toLocaleString("nb-NO"),
        getStatusLabel(submission.status),
      ];

      for (const field of answerFields) {
        const fv = submission.fieldValues.find((v) => v.fieldId === field.id);
        rowData.push(
          formatFieldValue(field.fieldType, field.options, fv?.value ?? null, fv?.fileKey ?? null)
        );
      }

      const dataRow = worksheet.addRow(rowData);

      // Zebra-striper
      const rowIdx = dataRow.number;
      if (rowIdx % 2 === 0) {
        dataRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F5F5" },
        };
      }

      // Tekstbryting for TEXTAREA-felt
      answerFields.forEach((field, colIdx) => {
        if (field.fieldType === "TEXTAREA") {
          const cell = dataRow.getCell(baseHeaders.length + colIdx + 1);
          cell.alignment = { wrapText: true, vertical: "top" };
        }
      });
    }

    // Auto-filter på header-rad
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: allHeaders.length },
    };

    // ── Metadata-ark ─────────────────────────────────────
    const metaSheet = workbook.addWorksheet("Info");
    metaSheet.columns = [
      { key: "key", width: 22 },
      { key: "value", width: 40 },
    ];
    metaSheet.addRow(["Skjema", form.title]);
    if (form.description) metaSheet.addRow(["Beskrivelse", form.description]);
    metaSheet.addRow(["Eksportert", new Date().toLocaleString("nb-NO")]);
    metaSheet.addRow(["Antall svar", submissions.length]);
    if (dateFilter) {
      metaSheet.addRow(["Periode fra", dateFilter.from.toLocaleDateString("nb-NO")]);
      metaSheet.addRow(["Periode til", dateFilter.to.toLocaleDateString("nb-NO")]);
    }
    metaSheet.addRow([]);
    metaSheet.addRow(["Felt i skjema", ""]);
    for (const field of answerFields) {
      metaSheet.addRow([
        field.label,
        getFieldTypeLabel(field.fieldType) + (field.isRequired ? " *" : ""),
      ]);
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();

    let filename = form.title.replace(/[^a-z0-9æøå]/gi, "_") + "_svar";
    if (dateFilter) {
      filename += `_${dateFilter.from.toISOString().slice(0, 10)}_${dateFilter.to.toISOString().slice(0, 10)}`;
    }
    filename += ".xlsx";

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Intern serverfeil" },
      { status: 500 }
    );
  }
}

function getFieldTypeLabel(fieldType: string): string {
  const labels: Record<string, string> = {
    TEXT: "Kort tekst",
    TEXTAREA: "Lang tekst",
    NUMBER: "Tall",
    DATE: "Dato",
    DATETIME: "Dato og tid",
    CHECKBOX: "Avkrysning",
    RADIO: "Radioknapper",
    SELECT: "Rullegardin",
    FILE: "Fil",
    SIGNATURE: "Signatur",
    LIKERT_SCALE: "Likert-skala (1–5)",
  };
  return labels[fieldType] || fieldType;
}
