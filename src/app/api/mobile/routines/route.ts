import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role, RoutineStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

const employeeVisibleRoutineStatuses: RoutineStatus[] = [RoutineStatus.ACTIVE, RoutineStatus.NEEDS_REVIEW];

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
      select: {
        role: true,
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Ingen tenant-tilgang" }, { status: 403 });
    }

    const role = membership.role as Role;
    const permissions = await resolveEffectivePermissions(session.user.tenantId, role);
    if (!permissions.canReadRoutines) {
      return NextResponse.json({ routines: [], uploads: [] }, { status: 200 });
    }

    const [routines, uploads, acknowledgements] = await Promise.all([
      prisma.routine.findMany({
        where: {
          tenantId: session.user.tenantId,
          status: { in: employeeVisibleRoutineStatuses },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          description: true,
          legalReference: true,
          updatedAt: true,
        },
      }),
      prisma.routineUploadedDocument.findMany({
        where: {
          tenantId: session.user.tenantId,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          documentType: true,
          fileKey: true,
          mime: true,
          originalFileName: true,
          createdAt: true,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          action: "ROUTINE_ACKNOWLEDGED",
        },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: {
          resource: true,
          createdAt: true,
        },
      }),
    ]);

    const acknowledgedAtByRoutineId = new Map<string, string>();
    for (const entry of acknowledgements) {
      const resource = entry.resource ?? "";
      const prefix = "Routine:";
      if (!resource.startsWith(prefix)) {
        continue;
      }
      const routineId = resource.slice(prefix.length);
      if (!routineId || acknowledgedAtByRoutineId.has(routineId)) {
        continue;
      }
      acknowledgedAtByRoutineId.set(routineId, entry.createdAt.toISOString());
    }

    const routinesWithAck = routines.map((routine) => {
      const acknowledgedAt = acknowledgedAtByRoutineId.get(routine.id) ?? null;
      const acknowledgedCurrent =
        acknowledgedAt !== null && new Date(acknowledgedAt).getTime() >= routine.updatedAt.getTime();
      return {
        ...routine,
        acknowledgedAt,
        acknowledgedCurrent,
      };
    });

    return NextResponse.json({ routines: routinesWithAck, uploads }, { status: 200 });
  } catch (error) {
    console.error("[Mobile Routines] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente rutiner" }, { status: 500 });
  }
}
