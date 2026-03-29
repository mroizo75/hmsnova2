import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.id || !session.user.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        tenants: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
    }

    const selectedMembership = user.tenants.find(
      (membership) => membership.tenantId === session.user.tenantId,
    );
    if (!selectedMembership) {
      return NextResponse.json({ error: "Ingen tenant-tilgang" }, { status: 403 });
    }

    const tenantId = selectedMembership.tenantId;
    const role = selectedMembership.role as Role;
    const permissions = getPermissions(role);

    const [
      incidentsTotal,
      incidentsOpen,
      documentsCount,
      trainingsCount,
      routinesCount,
      formsCount,
      unreadNotifications,
    ] = await Promise.all([
      permissions.canReadIncidents
        ? prisma.incident.count({
            where: {
              tenantId,
              ...(role === "ANSATT" ? { reportedBy: user.id } : {}),
            },
          })
        : prisma.incident.count({
            where: { tenantId, reportedBy: user.id },
          }),
      permissions.canReadIncidents
        ? prisma.incident.count({
            where: {
              tenantId,
              status: { in: ["OPEN", "INVESTIGATING"] },
              ...(role === "ANSATT" ? { reportedBy: user.id } : {}),
            },
          })
        : prisma.incident.count({
            where: {
              tenantId,
              reportedBy: user.id,
              status: { in: ["OPEN", "INVESTIGATING"] },
            },
          }),
      permissions.canReadDocuments
        ? prisma.document.count({ where: { tenantId } })
        : 0,
      permissions.canReadOwnTraining || permissions.canReadAllTraining
        ? prisma.training.count({
            where: {
              tenantId,
              ...(permissions.canReadAllTraining ? {} : { userId: user.id }),
              completedAt: null,
            },
          })
        : 0,
      permissions.canReadRoutines
        ? prisma.routine.count({
            where: {
              tenantId,
              status: { in: ["ACTIVE", "NEEDS_REVIEW"] },
            },
          })
        : 0,
      permissions.canReadForms
        ? prisma.formTemplate.count({
            where: {
              OR: [{ tenantId }, { isGlobal: true }],
              isActive: true,
            },
          })
        : 0,
      prisma.notification.count({
        where: {
          tenantId,
          userId: user.id,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json(
      {
        summary: {
          incidentsTotal,
          incidentsOpen,
          unreadNotifications,
          modules: {
            documents: {
              visible: permissions.canReadDocuments,
              count: documentsCount,
            },
            training: {
              visible: permissions.canReadOwnTraining || permissions.canReadAllTraining,
              count: trainingsCount,
            },
            routines: {
              visible: permissions.canReadRoutines,
              count: routinesCount,
            },
            forms: {
              visible: permissions.canReadForms,
              count: formsCount,
            },
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Mobile Dashboard Summary] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente dashboard-data" }, { status: 500 });
  }
}
