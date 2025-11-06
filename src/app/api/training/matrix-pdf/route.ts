import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PDFDocument from "pdfkit";
import { getTrainingStatus, STANDARD_COURSES } from "@/features/training/schemas/training.schema";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return new NextResponse("No tenant access", { status: 403 });
    }

    const tenantId = user.tenants[0].tenantId;

    // Hent alle brukere for tenant
    const users = await prisma.user.findMany({
      where: {
        tenants: {
          some: { tenantId },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Hent all opplæring for tenanten
    const trainings = await prisma.training.findMany({
      where: { tenantId },
      orderBy: { courseKey: "asc" },
    });

    // Bygg matrise
    const matrix = users.map((u) => ({
      user: u,
      trainings: trainings.filter((t) => t.userId === u.id),
    }));

    // Få alle unike kurs
    const allCourseKeys = Array.from(
      new Set(trainings.map((t) => t.courseKey))
    );

    const courses = STANDARD_COURSES.map((c) => ({
      key: c.key,
      title: c.title,
      isRequired: c.isRequired,
    }));

    // Legg til custom courses
    allCourseKeys.forEach((key) => {
      if (!courses.find((c) => c.key === key)) {
        const training = trainings.find((t) => t.courseKey === key);
        if (training) {
          courses.push({
            key,
            title: training.title,
            isRequired: false,
          });
        }
      }
    });

    // Opprett PDF
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Header
    doc.fontSize(18).font("Helvetica-Bold").text("Kompetansematrise", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).font("Helvetica").text(
      `Generert: ${new Date().toLocaleDateString("nb-NO")}`,
      { align: "center" }
    );
    doc.moveDown();

    // Beregn kolonnebredder
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const nameColWidth = 120;
    const courseColWidth = (pageWidth - nameColWidth) / Math.min(courses.length, 6);

    // Start tabell
    let yPos = doc.y;
    const rowHeight = 50;

    // Header rad
    doc.font("Helvetica-Bold").fontSize(8);
    doc.rect(doc.page.margins.left, yPos, nameColWidth, rowHeight).stroke();
    doc.text("Ansatt", doc.page.margins.left + 5, yPos + 5, {
      width: nameColWidth - 10,
      align: "left",
    });

    let xPos = doc.page.margins.left + nameColWidth;
    for (let i = 0; i < Math.min(courses.length, 6); i++) {
      const course = courses[i];
      doc.rect(xPos, yPos, courseColWidth, rowHeight).stroke();
      doc.text(course.title, xPos + 5, yPos + 5, {
        width: courseColWidth - 10,
        align: "center",
      });
      if (course.isRequired) {
        doc.fontSize(6).fillColor("red").text("Påkrevd", xPos + 5, yPos + 25, {
          width: courseColWidth - 10,
          align: "center",
        });
        doc.fillColor("black");
      }
      xPos += courseColWidth;
    }

    yPos += rowHeight;

    // Data rader
    doc.font("Helvetica").fontSize(8);

    for (const item of matrix) {
      // Sjekk om vi trenger ny side
      if (yPos + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ layout: "landscape" });
        yPos = doc.page.margins.top;
        
        // Gjenta header
        doc.font("Helvetica-Bold");
        doc.rect(doc.page.margins.left, yPos, nameColWidth, rowHeight).stroke();
        doc.text("Ansatt", doc.page.margins.left + 5, yPos + 5, {
          width: nameColWidth - 10,
          align: "left",
        });
        xPos = doc.page.margins.left + nameColWidth;
        for (let i = 0; i < Math.min(courses.length, 6); i++) {
          const course = courses[i];
          doc.rect(xPos, yPos, courseColWidth, rowHeight).stroke();
          doc.text(course.title, xPos + 5, yPos + 5, {
            width: courseColWidth - 10,
            align: "center",
          });
          xPos += courseColWidth;
        }
        yPos += rowHeight;
        doc.font("Helvetica");
      }

      // Navn kolonne
      doc.rect(doc.page.margins.left, yPos, nameColWidth, rowHeight).stroke();
      doc.text(item.user.name || "Ukjent", doc.page.margins.left + 5, yPos + 5, {
        width: nameColWidth - 10,
      });
      doc.fontSize(7).fillColor("gray");
      doc.text(item.user.email, doc.page.margins.left + 5, yPos + 20, {
        width: nameColWidth - 10,
      });
      doc.fillColor("black").fontSize(8);

      // Kurs kolonner
      xPos = doc.page.margins.left + nameColWidth;
      for (let i = 0; i < Math.min(courses.length, 6); i++) {
        const course = courses[i];
        const training = item.trainings.find((t) => t.courseKey === course.key);

        doc.rect(xPos, yPos, courseColWidth, rowHeight).stroke();

        if (training) {
          const status = getTrainingStatus(training);
          let statusText = "";
          let color = "black";

          switch (status) {
            case "VALID":
            case "COMPLETED":
              statusText = "✓ Gyldig";
              color = "green";
              break;
            case "EXPIRING_SOON":
              statusText = "⚠ Utløper snart";
              color = "orange";
              break;
            case "EXPIRED":
              statusText = "✗ Utløpt";
              color = "red";
              break;
            default:
              statusText = "-";
          }

          doc.fillColor(color).text(statusText, xPos + 5, yPos + 10, {
            width: courseColWidth - 10,
            align: "center",
          });

          if (training.validUntil) {
            doc.fontSize(7).fillColor("gray");
            doc.text(
              new Date(training.validUntil).toLocaleDateString("nb-NO"),
              xPos + 5,
              yPos + 25,
              {
                width: courseColWidth - 10,
                align: "center",
              }
            );
            doc.fontSize(8);
          }
          doc.fillColor("black");
        } else {
          if (course.isRequired) {
            doc.fillColor("red").text("✗ Mangler", xPos + 5, yPos + 15, {
              width: courseColWidth - 10,
              align: "center",
            });
            doc.fillColor("black");
          } else {
            doc.text("-", xPos + 5, yPos + 15, {
              width: courseColWidth - 10,
              align: "center",
            });
          }
        }

        xPos += courseColWidth;
      }

      yPos += rowHeight;
    }

    // Footer
    doc.moveDown();
    doc.fontSize(8).fillColor("gray");
    doc.text(
      "✓ = Gyldig  |  ⚠ = Utløper snart  |  ✗ = Utløpt/Mangler",
      { align: "center" }
    );

    doc.end();

    // Vent til PDF er ferdig
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="kompetansematrise-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

