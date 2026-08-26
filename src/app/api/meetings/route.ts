import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createMeetingSchema = z.object({
  type: z.enum(["AMU", "VO", "BHT", "HMS_COMMITTEE", "OTHER"]),
  title: z.string().min(1),
  scheduledDate: z.string().datetime(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal("")),
  agenda: z.union([z.string(), z.array(z.any())]).optional(),
  organizer: z.string().min(1),
  minuteTaker: z.string().optional(),
});

// GET /api/meetings - List all meetings for tenant
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const meetings = await db.meeting.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(type && { type: type as any }),
      },
      include: {
        participants: true,
        decisions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json({ data: meetings });
  } catch (error: any) {
    console.error("[MEETINGS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Create new meeting
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createMeetingSchema.parse(body);

    const meeting = await db.meeting.create({
      data: {
        ...validatedData,
        tenantId: session.user.tenantId,
        meetingLink: validatedData.meetingLink || null,
        agenda: validatedData.agenda
          ? typeof validatedData.agenda === "string"
            ? validatedData.agenda
            : JSON.stringify(validatedData.agenda)
          : null,
      },
      include: {
        participants: true,
        decisions: true,
      },
    });

    return NextResponse.json({ data: meeting }, { status: 201 });
  } catch (error: any) {
    console.error("[MEETINGS_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

