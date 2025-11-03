import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id, submissionId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await prisma.formTemplate.findUnique({
      where: { id, tenantId: session.user.tenantId! },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId, formTemplateId: id },
      include: {
        fieldValues: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Generer PDF med utfylt data
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Tittel
    doc.setFontSize(20);
    doc.text(form.title, margin, yPos);
    yPos += 10;

    // Beskrivelse
    if (form.description) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      const descLines = doc.splitTextToSize(form.description, pageWidth - 2 * margin);
      doc.text(descLines, margin, yPos);
      yPos += descLines.length * 7 + 5;
    }

    // Submission info
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Innsendt: ${new Date(submission.createdAt).toLocaleString("nb-NO")}`, margin, yPos);
    yPos += 5;
    doc.text(`Status: ${getStatusLabel(submission.status)}`, margin, yPos);
    yPos += 10;

    // Linje
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Felt og svar
    doc.setTextColor(0);
    for (const field of form.fields) {
      // Sjekk om vi trenger ny side
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      // Feltnavn
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const label = field.isRequired ? `${field.label} *` : field.label;
      doc.text(label, margin, yPos);
      yPos += 7;

      // Hjelpetekst
      if (field.helpText) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100);
        const helpLines = doc.splitTextToSize(field.helpText, pageWidth - 2 * margin);
        doc.text(helpLines, margin, yPos);
        yPos += helpLines.length * 4 + 3;
        doc.setTextColor(0);
      }

      // Svar
      const fieldValue = submission.fieldValues.find((fv) => fv.fieldId === field.id);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      if (fieldValue) {
        if (fieldValue.fileKey) {
          doc.setTextColor(50, 50, 200);
          doc.text(`[Vedlagt fil: ${fieldValue.fileKey.split("/").pop()}]`, margin + 5, yPos);
          doc.setTextColor(0);
          yPos += 10;
        } else if (fieldValue.value) {
          doc.setTextColor(0);
          if (field.fieldType === "TEXTAREA") {
            const answerLines = doc.splitTextToSize(fieldValue.value, pageWidth - 2 * margin - 10);
            doc.text(answerLines, margin + 5, yPos);
            yPos += answerLines.length * 6 + 5;
          } else {
            doc.text(fieldValue.value, margin + 5, yPos);
            yPos += 10;
          }
        } else {
          doc.setTextColor(150);
          doc.text("(Ikke besvart)", margin + 5, yPos);
          doc.setTextColor(0);
          yPos += 10;
        }
      } else {
        doc.setTextColor(150);
        doc.text("(Ikke besvart)", margin + 5, yPos);
        doc.setTextColor(0);
        yPos += 10;
      }

      yPos += 5;
    }

    // Signatur
    if (form.requiresSignature && submission.signedAt) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Digital signatur", margin, yPos);
      yPos += 7;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Signert: ${new Date(submission.signedAt).toLocaleString("nb-NO")}`, margin, yPos);
      yPos += 10;

      // Vis signatur-bilde hvis tilgjengelig i metadata
      if (submission.metadata) {
        try {
          const metadata = JSON.parse(submission.metadata);
          if (metadata.signatureData) {
            doc.addImage(metadata.signatureData, "PNG", margin, yPos, 80, 30);
          }
        } catch (e) {
          // Ignorer hvis metadata ikke kan parses
        }
      }
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `HMS Nova - ${form.title} - Side ${i} av ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    // Generer PDF som buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, "_")}_${submission.createdAt.toISOString().split("T")[0]}.pdf"`,
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Kladd",
    SUBMITTED: "Innsendt",
    APPROVED: "Godkjent",
    REJECTED: "Avvist",
  };
  return labels[status] || status;
}

