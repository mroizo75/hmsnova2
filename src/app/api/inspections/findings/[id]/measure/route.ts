import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: findingId } = await params;
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

  const finding = await prisma.inspectionFinding.findFirst({
    where: { id: findingId },
    include: { inspection: { select: { tenantId: true, title: true } } },
  });

  if (!finding || finding.inspection.tenantId !== tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (finding.linkedMeasureId) {
    return NextResponse.json({ error: "Finding already has a measure" }, { status: 400 });
  }

  const body = await request.json();

  const measure = await prisma.measure.create({
    data: {
      tenantId,
      title: body.title || `Tiltak: ${finding.title}`,
      description: body.description || finding.description,
      dueAt: body.dueAt ? new Date(body.dueAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      responsibleId: body.responsibleId || user.id,
      status: "PENDING",
      category: "CORRECTIVE",
    },
  });

  await prisma.inspectionFinding.update({
    where: { id: findingId },
    data: { linkedMeasureId: measure.id },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: user.id,
      action: "MEASURE_CREATED",
      resource: `Measure:${measure.id}`,
      metadata: JSON.stringify({
        title: measure.title,
        source: "InspectionFinding",
        findingId,
      }),
    },
  });

  return NextResponse.json({ success: true, data: measure });
}
