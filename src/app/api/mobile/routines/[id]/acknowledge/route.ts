import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role, RoutineStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuditLog } from "@/lib/audit-log";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

const employeeVisibleRoutineStatuses: RoutineStatus[] = [RoutineStatus.ACTIVE, RoutineStatus.NEEDS_REVIEW];

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: Context) {
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
      select: {
        role: true,
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Ingen tenant-tilgang" }, { status: 403 });
    }

    const permissions = await resolveEffectivePermissions(
      session.user.tenantId,
      membership.role as Role,
    );
    if (!permissions.canReadRoutines) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "Mangler rutine-id" }, { status: 400 });
    }

    const routine = await prisma.routine.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
        status: { in: employeeVisibleRoutineStatuses },
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });

    if (!routine) {
      return NextResponse.json({ error: "Rutine ikke funnet" }, { status: 404 });
    }

    const acknowledgedAt = new Date();
    await AuditLog.log(
      session.user.tenantId,
      session.user.id,
      "ROUTINE_ACKNOWLEDGED",
      "Routine",
      routine.id,
      {
        title: routine.title,
        routineUpdatedAt: routine.updatedAt.toISOString(),
        acknowledgedAt: acknowledgedAt.toISOString(),
      },
    );

    return NextResponse.json({
      acknowledgedAt: acknowledgedAt.toISOString(),
      acknowledgedCurrent: true,
    });
  } catch (error) {
    console.error("[Mobile Routine Acknowledge] Error:", error);
    return NextResponse.json({ error: "Kunne ikke bekrefte lesing" }, { status: 500 });
  }
}
