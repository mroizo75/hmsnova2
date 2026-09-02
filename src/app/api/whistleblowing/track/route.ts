import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { toPublicTrackView } from "@/lib/whistleblowing-case-access";

export const dynamic = "force-dynamic";

const trackSchema = z.object({
  caseNumber: z.string().min(1),
  accessCode: z.string().min(1),
});

// POST /api/whistleblowing/track - Track report with access code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseNumber, accessCode } = trackSchema.parse(body);

    const report = await db.whistleblowing.findFirst({
      where: {
        caseNumber,
        accessCode,
      },
      include: {
        messages: {
          where: {
            isInternal: false, // Only non-internal messages for reporter
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Ugyldig saksnummer eller tilgangskode" },
        { status: 404 }
      );
    }

    // Mark messages as read by reporter
    await db.whistleblowMessage.updateMany({
      where: {
        whistleblowingId: report.id,
        readByReporter: false,
      },
      data: {
        readByReporter: true,
      },
    });

    return NextResponse.json({
      data: toPublicTrackView(report as unknown as Record<string, unknown>),
    });
  } catch (error: any) {
    console.error("[WHISTLEBLOWING_TRACK]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

