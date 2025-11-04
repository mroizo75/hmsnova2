import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAuditReport } from "@/lib/audit-pdf";

/**
 * GET /api/audits/[id]/report
 * Generate PDF report for audit
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

    const audit = await prisma.audit.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: [{ findingType: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!audit) {
      return new NextResponse("Audit not found", { status: 404 });
    }

    const pdfBuffer = await generateAuditReport(audit);

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Revisjonsrapport-${audit.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Audit Report] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

