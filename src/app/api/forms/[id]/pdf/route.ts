import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";

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
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Generer PDF
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
      yPos += descLines.length * 7 + 10;
    }

    // Linje
    doc.setDrawColor(200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Felt
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
        doc.setFontSize(10);
        doc.setTextColor(100);
        const helpLines = doc.splitTextToSize(field.helpText, pageWidth - 2 * margin);
        doc.text(helpLines, margin, yPos);
        yPos += helpLines.length * 5 + 3;
        doc.setTextColor(0);
      }

      // Svarområde
      doc.setFont("helvetica", "normal");
      if (field.fieldType === "TEXTAREA") {
        // Stort felt
        doc.rect(margin, yPos, pageWidth - 2 * margin, 30);
        yPos += 35;
      } else if (field.fieldType === "SIGNATURE") {
        // Signaturområde
        doc.setFontSize(10);
        doc.text("Signatur:", margin, yPos);
        yPos += 5;
        doc.rect(margin, yPos, pageWidth - 2 * margin, 20);
        yPos += 25;
      } else if (field.fieldType === "RADIO" || field.fieldType === "SELECT") {
        // Alternativer
        const options = field.options ? JSON.parse(field.options) : [];
        doc.setFontSize(10);
        for (const option of options) {
          doc.circle(margin + 3, yPos - 1, 2);
          doc.text(option, margin + 8, yPos);
          yPos += 6;
        }
        yPos += 5;
      } else if (field.fieldType === "CHECKBOX") {
        doc.rect(margin, yPos - 4, 4, 4);
        doc.text("Ja", margin + 7, yPos);
        yPos += 10;
      } else {
        // Vanlig tekstfelt
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
        yPos += 10;
      }

      yPos += 5;
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
        "Content-Disposition": `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, "_")}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Generate PDF error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

