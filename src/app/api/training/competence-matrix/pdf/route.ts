/**
 * Kompetansematrise PDF
 * Bruker profesjonell HMS Nova-branding via pdf-brand.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateBrandedPdf } from "@/lib/pdf-brand";
import { z } from "zod";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

const matrixDataSchema = z.object({
  matrixData: z.array(
    z.object({
      userName: z.string(),
      courses: z.array(
        z.object({
          courseTitle: z.string(),
          status: z.string(),
          completedAt: z.string().optional(),
          validUntil: z.string().optional(),
          isRequired: z.boolean(),
        })
      ),
    })
  ),
  courseHeaders: z.array(z.string()),
  tenantId: z.string(),
});

function statusText(course: { status: string; validUntil?: string }): string {
  const d = course.validUntil
    ? format(new Date(course.validUntil), "dd.MM.yy", { locale: nb })
    : null;

  switch (course.status) {
    case "VALID":
    case "COMPLETED":
      return d ? `OK – ${d}` : "OK";
    case "EXPIRING_SOON":
      return d ? `Utløper ${d}` : "Utløper snart";
    case "EXPIRED":
      return d ? `Utløpt ${d}` : "Utløpt";
    case "MISSING_REQUIRED":
      return "Mangler (påkrevd)";
    default:
      return "–";
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = await request.json();
    const { matrixData, courseHeaders, tenantId } = matrixDataSchema.parse(body);

    if (session.user.tenantId !== tenantId) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, orgNumber: true, logoUrl: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant ikke funnet" }, { status: 404 });
    }

    const tableRows = matrixData.map((row) => [
      row.userName,
      ...row.courses.map((c) => statusText(c)),
    ]);

    const missingRequired = matrixData.flatMap((row) =>
      row.courses
        .filter((c) => c.status === "MISSING_REQUIRED")
        .map((c) => `${row.userName}: ${c.courseTitle}`)
    );

    const pdfBuffer = await generateBrandedPdf({
      type: "formal",
      reportLabel: "Kompetansematrise",
      title: "Kompetansematrise – opplæringsoversikt",
      tenant: {
        name: tenant.name,
        orgNumber: tenant.orgNumber,
        logoUrl: tenant.logoUrl,
      },
      generatedAt: new Date(),
      sections: [
        {
          title: "Oversikt",
          content: [
            {
              type: "table",
              headers: ["Ansatt", ...courseHeaders],
              rows: tableRows,
            },
          ],
        },
        ...(missingRequired.length > 0
          ? [
              {
                title: "Mangler – påkrevd opplæring",
                content: [
                  {
                    type: "alert" as const,
                    text: `Følgende ansatte mangler påkrevd opplæring:\n${missingRequired.join("\n")}`,
                    severity: "warning" as const,
                  },
                ],
              },
            ]
          : []),
      ],
    });

    const filename = `kompetansematrise-${format(new Date(), "yyyy-MM-dd")}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ugyldig input", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Kunne ikke generere PDF" }, { status: 500 });
  }
}
