import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; decisionId: string }> }
) {
  const { id: meetingId, decisionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const tenantId = session.user.tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const decision = await prisma.meetingDecision.findFirst({
    where: { id: decisionId, meetingId },
    include: { meeting: { select: { tenantId: true } } },
  });

  if (!decision || decision.meeting.tenantId !== tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (decision.measureId) {
    return NextResponse.json({ error: "Decision already has a measure" }, { status: 400 });
  }

  const measure = await prisma.measure.create({
    data: {
      tenantId,
      title: decision.title,
      description: decision.description,
      dueAt: decision.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      responsibleId: decision.responsibleId || user.id,
      status: "PENDING",
      category: "CORRECTIVE",
    },
  });

  await prisma.meetingDecision.update({
    where: { id: decisionId },
    data: { measureId: measure.id },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: user.id,
      action: "MEASURE_CREATED",
      resource: `Measure:${measure.id}`,
      metadata: JSON.stringify({
        title: measure.title,
        source: "MeetingDecision",
        decisionId,
        meetingId,
      }),
    },
  });

  return NextResponse.json({ success: true, data: measure });
}
