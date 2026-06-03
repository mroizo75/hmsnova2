import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateFireDrillReport } from "@/lib/fire-drill-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.tenantId) {
      return new NextResponse("Unauthorized", { status: 401 });
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
        tenant: { select: { name: true } },
      },
    });

    if (!drill) {
      return new NextResponse("Ikke funnet", { status: 404 });
    }

    // Hent navn på øvingsleder og evaluator
    const userIds = [drill.responsibleId, drill.evaluatedBy].filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.email]));

    const pdfBuffer = await generateFireDrillReport({
      id: drill.id,
      title: drill.title,
      drillType: drill.drillType,
      isAnnounced: drill.isAnnounced,
      status: drill.status,
      plannedDate: drill.plannedDate,
      completedAt: drill.completedAt,
      location: drill.location,
      responsibleName: userMap[drill.responsibleId] ?? drill.responsibleId,
      objectives: drill.objectives,
      scenario: drill.scenario,
      riskAssessment: drill.riskAssessment,
      actualParticipantCount: drill.actualParticipantCount,
      evacuationTimeSeconds: drill.evacuationTimeSeconds,
      observations: drill.observations,
      objectivesAchieved: drill.objectivesAchieved,
      evaluation: drill.evaluation,
      improvementPoints: drill.improvementPoints,
      procedureChangesNeeded: drill.procedureChangesNeeded,
      procedureChangesDesc: drill.procedureChangesDesc,
      evaluatedByName: drill.evaluatedBy ? (userMap[drill.evaluatedBy] ?? null) : null,
      evaluatedAt: drill.evaluatedAt,
      measures: drill.measures.map((m) => ({
        title: m.title,
        status: m.status,
        dueAt: m.dueAt,
        responsibleName: m.responsible?.name ?? m.responsible?.email ?? null,
      })),
      tenantName: drill.tenant.name,
    });

    const safeName = drill.title.replace(/[^a-zA-Z0-9æøåÆØÅ\s-]/g, "").replace(/\s+/g, "-");

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Brannøvelsesrapport-${safeName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[FireDrill Rapport]", error);
    return new NextResponse("Intern feil", { status: 500 });
  }
}
