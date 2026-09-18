import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateParticipantSchema = z.object({
  attended: z.boolean().optional(),
  role: z.enum(["CHAIR", "SECRETARY", "MEMBER", "OBSERVER"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id, participantId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateParticipantSchema.parse(body);
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: "Ingen felter å oppdatere" }, { status: 400 });
    }

    const meeting = await db.meeting.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const existing = await db.meetingParticipant.findFirst({
      where: { id: participantId, meetingId: id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Deltaker ikke funnet" }, { status: 404 });
    }

    const participant = await db.meetingParticipant.update({
      where: { id: participantId },
      data: validatedData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: participant });
  } catch (error: any) {
    console.error("[MEETING_PARTICIPANT_PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
