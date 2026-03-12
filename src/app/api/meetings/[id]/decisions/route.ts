import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  decisionNumber: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  responsibleId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

// POST /api/meetings/[id]/decisions - Add decision
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
    const validatedData = decisionSchema.parse(body);

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
    if (validatedData.responsibleId) {
      const responsibleUser = await db.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: validatedData.responsibleId,
            tenantId: session.user.tenantId,
          },
        },
        select: { userId: true },
      });
      if (!responsibleUser) {
        return NextResponse.json({ error: "Ansvarlig bruker ikke funnet i tenant" }, { status: 400 });
      }
    }

    const decision = await db.meetingDecision.create({
      data: {
        meetingId: id,
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      },
    });

    return NextResponse.json({ data: decision }, { status: 201 });
  } catch (error: any) {
    console.error("[MEETING_DECISION_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

