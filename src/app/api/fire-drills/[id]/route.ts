import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateFireDrillSchema } from "@/features/fire-drills/schemas/fire-drill.schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const drill = await prisma.fireDrill.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        measures: {
          include: {
            responsible: { select: { id: true, name: true, email: true } },
          },
          orderBy: { dueAt: "asc" },
        },
      },
    });

    if (!drill) {
      return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    }

    return NextResponse.json(drill);
  } catch {
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.fireDrill.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateFireDrillSchema.parse({
      ...body,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : undefined,
    });

    const drill = await prisma.fireDrill.update({
      where: { id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.drillType !== undefined && { drillType: validated.drillType }),
        ...(validated.isAnnounced !== undefined && { isAnnounced: validated.isAnnounced }),
        ...(validated.plannedDate !== undefined && { plannedDate: validated.plannedDate }),
        ...(validated.location !== undefined && { location: validated.location }),
        ...(validated.responsibleId !== undefined && { responsibleId: validated.responsibleId }),
        ...(validated.objectives !== undefined && { objectives: validated.objectives }),
        ...(validated.scenario !== undefined && { scenario: validated.scenario }),
        ...(validated.riskAssessment !== undefined && { riskAssessment: validated.riskAssessment }),
        ...(validated.participantIds !== undefined && {
          participantIds: JSON.stringify(validated.participantIds),
        }),
        ...(validated.status !== undefined && { status: validated.status }),
      },
    });

    return NextResponse.json(drill);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ugyldig data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.fireDrill.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
    }

    await prisma.fireDrill.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
