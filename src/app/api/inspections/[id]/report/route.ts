import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInspectionReport } from "@/lib/inspection-pdf";

/**
 * GET /api/inspections/[id]/report
 * Generate PDF report for inspection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: { severity: "desc" },
        },
      },
    });

    if (!inspection) {
      return new NextResponse("Inspection not found", { status: 404 });
    }

    const pdfBuffer = await generateInspectionReport({
      ...inspection,
      conductedBy: session.user.name || session.user.email || "Ukjent",
    });

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Inspeksjon-${inspection.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Inspection Report] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

