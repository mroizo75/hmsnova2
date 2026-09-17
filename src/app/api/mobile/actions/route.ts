import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const membership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
      },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Ingen tenant-tilgang" }, { status: 403 });
    }

    const permissions = await resolveEffectivePermissions(
      session.user.tenantId,
      membership.role as Role,
    );

    const measures = await prisma.measure.findMany({
      where: permissions.canReadActions
        ? { tenantId: session.user.tenantId }
        : { tenantId: session.user.tenantId, responsibleId: session.user.id },
      orderBy: { dueAt: "asc" },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueAt: true,
        category: true,
        completedAt: true,
        responsibleId: true,
        responsible: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      actions: measures.map((measure) => ({
        id: measure.id,
        title: measure.title,
        description: measure.description,
        status: measure.status,
        dueAt: measure.dueAt.toISOString(),
        category: measure.category,
        completedAt: measure.completedAt?.toISOString() ?? null,
        responsibleId: measure.responsibleId,
        responsibleName: measure.responsible.name,
        mine: measure.responsibleId === session.user.id,
      })),
    });
  } catch (error) {
    console.error("[Mobile Actions] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente tiltak" }, { status: 500 });
  }
}
