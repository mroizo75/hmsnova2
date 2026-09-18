import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const participantSchema = z.object({
  userId: z.string().optional(),
  externalName: z.string().optional(),
  externalEmail: z.string().email().optional(),
  role: z.enum(["CHAIR", "SECRETARY", "MEMBER", "OBSERVER"]),
  attended: z.boolean().optional(),
  notes: z.string().optional(),
});

// POST /api/meetings/[id]/participants - Add participant
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = participantSchema.parse(body);

    // Verify meeting exists and belongs to tenant
    const meeting = await db.meeting.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (validatedData.userId) {
      const participantUser = await db.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: validatedData.userId,
            tenantId: session.user.tenantId,
          },
        },
        select: { userId: true },
      });
      if (!participantUser) {
        return NextResponse.json({ error: "Bruker ikke funnet i tenant" }, { status: 400 });
      }
    }

    const participant = await db.meetingParticipant.create({
      data: {
        meetingId: id,
        ...validatedData,
      },
    });

    return NextResponse.json({ data: participant }, { status: 201 });
  } catch (error: any) {
    console.error("[MEETING_PARTICIPANT_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const bulkAttendanceSchema = z.object({
  attended: z.boolean(),
  participantIds: z.array(z.string().min(1)).optional(),
});

// PATCH /api/meetings/[id]/participants — oppdater oppmøte for én, flere eller alle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = bulkAttendanceSchema.parse(body);

    const meeting = await db.meeting.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      select: { id: true },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const result = await db.meetingParticipant.updateMany({
      where: {
        meetingId: id,
        ...(validatedData.participantIds
          ? { id: { in: validatedData.participantIds } }
          : {}),
      },
      data: { attended: validatedData.attended },
    });

    return NextResponse.json({ data: { updated: result.count } });
  } catch (error: any) {
    console.error("[MEETING_PARTICIPANT_PATCH_BULK]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

