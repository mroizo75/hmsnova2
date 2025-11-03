import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await prisma.formTemplate.findUnique({
      where: { id, tenantId: session.user.tenantId! },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
        submissions: {
          include: {
            fieldValues: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Lag Excel-data
    const data: any[] = [];

    // Header-rad
    const headers = [
      "Dato",
      "Status",
      ...form.fields.map((f) => f.label),
    ];

    data.push(headers);

    // Data-rader
    for (const submission of form.submissions) {
      const row: any[] = [
        new Date(submission.createdAt).toLocaleString("nb-NO"),
        getStatusLabel(submission.status),
      ];

      // Legg til feltverdier
      for (const field of form.fields) {
        const fieldValue = submission.fieldValues.find((fv) => fv.fieldId === field.id);
        if (fieldValue) {
          if (fieldValue.fileKey) {
            row.push(`[Fil: ${fieldValue.fileKey}]`);
          } else {
            row.push(fieldValue.value || "");
          }
        } else {
          row.push("");
        }
      }

      data.push(row);
    }

    // Opprett workbook
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Svar");

    // Generer Excel-fil
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, "_")}_svar.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export Excel error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
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

