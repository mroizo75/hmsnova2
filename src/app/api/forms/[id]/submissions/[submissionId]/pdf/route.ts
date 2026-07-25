import { NextRequest, NextResponse } from "next/server";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";
import { getStorage } from "@/lib/storage";
import { resolveEffectivePermissions } from "@/lib/server-authorization";
import { Role } from "@prisma/client";

function formatFieldValue(fieldType: string, optionsJson: string | null, rawValue: string | null, fileKey: string | null): string {
  if (fileKey) {
    return `[Vedlagt fil: ${fileKey.split("/").pop()}]`;
  }

  if (!rawValue) return "(Ikke besvart)";

  switch (fieldType) {
    case "CHECKBOX": {
      const options = parseJsonArray(optionsJson);
      if (options.length > 0) {
        const selected = parseJsonArray(rawValue);
        return selected.length > 0 ? selected.join(", ") : "(Ingen valgt)";
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
          month: "long",
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
          month: "long",
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

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isImageKey(key: string): boolean {
  const ext = key.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext ?? "");
}

function getImageFormat(key: string): "JPEG" | "PNG" | "GIF" | "WEBP" {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "png") return "PNG";
  if (ext === "gif") return "GIF";
  if (ext === "webp") return "WEBP";
  return "JPEG";
}

async function fetchImageAsBase64(fileKey: string): Promise<string | null> {
  try {
    const storage = getStorage();
    const buffer = await storage.get(fileKey);
    if (!buffer) return null;
    return buffer.toString("base64");
  } catch {
    return null;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const tenantContext = await getRequiredTenantContext();
    const { id, submissionId } = await params;
    const activeTenantId = tenantContext.tenantId;
    const activeUserId = tenantContext.userId;
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: activeUserId,
          tenantId: activeTenantId,
        },
      },
      select: { role: true },
    });
    const permissions = await resolveEffectivePermissions(
      activeTenantId,
      (userTenant?.role ?? "ANSATT") as Role
    );

    const form = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { order: "asc" } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    const canAccessForm = form.tenantId === activeTenantId || form.isGlobal;
    if (!canAccessForm) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }
    const restrictedGlobalView = form.isGlobal && !permissions.canManageForms;

    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId, formTemplateId: id, tenantId: activeTenantId },
      include: {
        fieldValues: true,
        submittedBy: { select: { name: true, email: true } },
        project: { select: { name: true, code: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    if (restrictedGlobalView && submission.submittedById !== activeUserId) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const valueMap = new Map(submission.fieldValues.map((fv) => [fv.fieldId, fv]));

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 20;

    function checkPageBreak(needed: number) {
      if (yPos + needed > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
    }

    // ── Header-blokk ──────────────────────────────────────
    doc.setFillColor(0, 100, 60);
    doc.rect(0, 0, pageWidth, 14, "F");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("HMS Nova", margin, 9);
    yPos = 24;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const titleLines = doc.splitTextToSize(form.title, contentWidth);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 9 + 4;

    if (form.description) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const descLines = doc.splitTextToSize(form.description, contentWidth);
      doc.text(descLines, margin, yPos);
      yPos += descLines.length * 6 + 4;
    }

    // ── Metadata-rad ──────────────────────────────────────
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const metaItems: string[] = [];
    if (submission.submissionNumber) metaItems.push(`Ref: ${submission.submissionNumber}`);
    metaItems.push(`Innsendt: ${new Date(submission.createdAt).toLocaleString("nb-NO")}`);
    metaItems.push(`Status: ${getStatusLabel(submission.status)}`);
    const submittedByName = submission.submittedBy?.name || submission.submittedBy?.email;
    if (submittedByName) metaItems.push(`Utfylt av: ${submittedByName}`);
    if (submission.project) {
      metaItems.push(
        `Prosjekt: ${submission.project.name}${submission.project.code ? ` (${submission.project.code})` : ""}`
      );
    }
    doc.text(metaItems.join("   •   "), margin, yPos);
    yPos += 6;

    doc.setDrawColor(0, 100, 60);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;

    // Hent feltmerknader fra metadata
    const fieldComments: Record<string, string> = (() => {
      if (!submission.metadata) return {};
      try {
        const meta = JSON.parse(submission.metadata);
        return meta.fieldComments ?? {};
      } catch {
        return {};
      }
    })();

    // ── Feltene ───────────────────────────────────────────
    doc.setTextColor(0, 0, 0);

    for (const field of form.fields) {
      // Seksjonsoverskrift behandles separat
      if (field.fieldType === "SECTION_HEADER") {
        checkPageBreak(18);
        if (yPos > 30) yPos += 4;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 100, 60);
        const sectionLines = doc.splitTextToSize(field.label, contentWidth);
        doc.text(sectionLines, margin, yPos);
        yPos += sectionLines.length * 7;
        doc.setDrawColor(0, 100, 60);
        doc.setLineWidth(0.3);
        doc.line(margin, yPos + 1, pageWidth - margin, yPos + 1);
        yPos += 8;
        if (field.helpText) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          const htLines = doc.splitTextToSize(field.helpText, contentWidth);
          doc.text(htLines, margin, yPos);
          yPos += htLines.length * 5 + 4;
        }
        doc.setTextColor(0, 0, 0);
        continue;
      }

      const fieldValue = valueMap.get(field.id);
      const rawValue = fieldValue?.value ?? null;
      const fileKey = fieldValue?.fileKey ?? null;
      const displayValue = formatFieldValue(field.fieldType, field.options, rawValue, fileKey);
      const isMultiLine = field.fieldType === "TEXTAREA";

      // Plass vi trenger: spørsmålslabel (7) + evt. helptext (5/linje) + svar (7–30)
      checkPageBreak(isMultiLine ? 40 : 22);

      // Spørsmål
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const labelText = field.isRequired ? `${field.label} *` : field.label;
      const labelLines = doc.splitTextToSize(labelText, contentWidth);
      doc.text(labelLines, margin, yPos);
      yPos += labelLines.length * 6 + 2;

      // Hjelpetekst
      if (field.helpText) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const htLines = doc.splitTextToSize(field.helpText, contentWidth);
        doc.text(htLines, margin, yPos);
        yPos += htLines.length * 4 + 2;
      }

      // Svar
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const isUnanswered = displayValue === "(Ikke besvart)" || displayValue === "(Ingen valgt)";

      if (fileKey && isImageKey(fileKey)) {
        // Hent bilde og embed
        const base64 = await fetchImageAsBase64(fileKey);
        if (base64) {
          const format = getImageFormat(fileKey);
          const maxImgWidth = contentWidth - 4;
          const maxImgHeight = 80;
          checkPageBreak(maxImgHeight + 14);
          try {
            // Beregn proporsjoner
            const tempImg = { width: maxImgWidth, height: maxImgHeight };
            doc.addImage(base64, format, margin + 4, yPos, tempImg.width, tempImg.height, undefined, "MEDIUM");
            yPos += maxImgHeight + 4;
          } catch {
            doc.setTextColor(50, 50, 200);
            doc.text(`[Bilde: ${fileKey.split("/").pop()}]`, margin + 4, yPos);
            yPos += 8;
          }
        } else {
          doc.setTextColor(50, 50, 200);
          doc.text(`[Bilde: ${fileKey.split("/").pop()}]`, margin + 4, yPos);
          yPos += 8;
        }
        doc.setTextColor(0, 0, 0);
      } else if (fileKey) {
        doc.setTextColor(50, 50, 200);
        doc.text(`[Vedlagt fil: ${fileKey.split("/").pop()}]`, margin + 4, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 8;
      } else if (isMultiLine) {
        doc.setTextColor(isUnanswered ? 150 : 0, isUnanswered ? 150 : 0, isUnanswered ? 150 : 0);
        const answerLines = doc.splitTextToSize(displayValue, contentWidth - 4);
        doc.setFillColor(250, 250, 240);
        doc.rect(margin, yPos - 4, contentWidth, answerLines.length * 5.5 + 4, "F");
        doc.text(answerLines, margin + 4, yPos);
        yPos += answerLines.length * 5.5;
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setTextColor(isUnanswered ? 150 : 0, isUnanswered ? 150 : 0, isUnanswered ? 150 : 0);
        doc.text(displayValue, margin + 4, yPos);
        doc.setTextColor(0, 0, 0);
      }

      yPos += 6;

      // Merknad for dette feltet (hvis finnes)
      const comment = fieldComments[field.id];
      if (comment) {
        const commentLines = doc.splitTextToSize(comment, contentWidth - 10);
        checkPageBreak(commentLines.length * 5 + 12);

        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos, contentWidth, commentLines.length * 5 + 8, "F");
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.line(margin + 3, yPos, margin + 3, yPos + commentLines.length * 5 + 8);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);
        doc.text("Merknad:", margin + 8, yPos + 4);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(commentLines, margin + 8, yPos + 9);
        yPos += commentLines.length * 5 + 12;
      }

      yPos += 4;
    }

    // ── Signatur ──────────────────────────────────────────
    if (form.requiresSignature && submission.signedAt) {
      checkPageBreak(50);
      yPos += 4;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Digital signatur", margin, yPos);
      yPos += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Signert: ${new Date(submission.signedAt).toLocaleString("nb-NO")}`, margin, yPos);
      yPos += 8;

      if (submission.metadata) {
        try {
          const metadata = JSON.parse(submission.metadata);
          if (metadata.signatureData) {
            doc.addImage(metadata.signatureData, "PNG", margin, yPos, 80, 30);
            yPos += 35;
          }
        } catch {
          // Ignorer parsefeil
        }
      }
    }

    // ── Footer på alle sider ──────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `HMS Nova – ${form.title} – Side ${i} av ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${form.title.replace(/[^a-z0-9æøå]/gi, "_")}_${submission.createdAt.toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Generate submission PDF error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
