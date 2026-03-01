import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateIsoReport } from "@/lib/reports/iso-reports";

const allowedTypes = ["environment", "risk"] as const;
const allowedFormats = ["pdf", "excel"] as const;

type ReportType = (typeof allowedTypes)[number];
type ReportFormat = (typeof allowedFormats)[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: ReportType }> }
) {
  try {
    const resolvedParams = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = resolvedParams.type;
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Ugyldig rapporttype" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const formatParam = (searchParams.get("format") || "pdf") as ReportFormat;
    if (!allowedFormats.includes(formatParam)) {
      return NextResponse.json(
        { error: "Ugyldig format. Bruk pdf eller excel." },
        { status: 400 }
      );
    }

    const report = await generateIsoReport(
      session.user.tenantId,
      type,
      formatParam
    );

    return new NextResponse(report.buffer, {
      headers: {
        "Content-Type": report.contentType,
        "Content-Disposition": `attachment; filename="${report.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[ISO_REPORT]", error);
    return NextResponse.json(
      { error: "Kunne ikke generere rapport" },
      { status: 500 }
    );
  }
}

