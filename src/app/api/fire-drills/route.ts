import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createFireDrillSchema } from "@/features/fire-drills/schemas/fire-drill.schema";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drills = await prisma.fireDrill.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        measures: { select: { id: true, status: true } },
      },
      orderBy: { plannedDate: "desc" },
    });

    return NextResponse.json(drills);
  } catch {
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validated = createFireDrillSchema.parse({
      ...body,
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : undefined,
    });

    const drill = await prisma.fireDrill.create({
      data: {
        tenantId: session.user.tenantId,
        title: validated.title,
        drillType: validated.drillType,
        isAnnounced: validated.isAnnounced,
        plannedDate: validated.plannedDate,
        location: validated.location,
        responsibleId: validated.responsibleId,
        objectives: validated.objectives,
        scenario: validated.scenario ?? null,
        riskAssessment: validated.riskAssessment ?? null,
        participantIds: validated.participantIds
          ? JSON.stringify(validated.participantIds)
          : null,
        status: "PLANNED",
      },
    });

    return NextResponse.json(drill, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Ugyldig data", details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
