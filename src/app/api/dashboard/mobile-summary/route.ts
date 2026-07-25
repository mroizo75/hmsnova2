import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

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
    const permissions = await resolveEffectivePermissions(tenantId, role);

    const [
      incidentsTotal,
      incidentsOpen,
      documentsCount,
      documentsRecent,
      trainingsCount,
      trainingsPending,
      routinesCount,
      routinesRecent,
      formsCount,
      formsRecent,
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
      permissions.canReadDocuments
        ? prisma.document.findMany({
            where: {
              tenantId,
              status: { not: "ARCHIVED" },
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: {
              id: true,
              title: true,
              status: true,
            },
          })
        : [],
      permissions.canReadOwnTraining || permissions.canReadAllTraining
        ? prisma.training.count({
            where: {
              tenantId,
              ...(permissions.canReadAllTraining ? {} : { userId: user.id }),
              completedAt: null,
            },
          })
        : 0,
      permissions.canReadOwnTraining || permissions.canReadAllTraining
        ? prisma.training.findMany({
            where: {
              tenantId,
              ...(permissions.canReadAllTraining ? {} : { userId: user.id }),
              completedAt: null,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              title: true,
              provider: true,
            },
          })
        : [],
      permissions.canReadRoutines
        ? prisma.routine.count({
            where: {
              tenantId,
              status: { in: ["ACTIVE", "NEEDS_REVIEW"] },
            },
          })
        : 0,
      permissions.canReadRoutines
        ? prisma.routine.findMany({
            where: {
              tenantId,
              status: { in: ["ACTIVE", "NEEDS_REVIEW"] },
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: {
              id: true,
              title: true,
              status: true,
            },
          })
        : [],
      permissions.canReadForms
        ? prisma.formTemplate.count({
            where: {
              tenantId,
              isActive: true,
            },
          })
        : 0,
      permissions.canReadForms
        ? prisma.formTemplate.findMany({
            where: {
              tenantId,
              isActive: true,
            },
            orderBy: { title: "asc" },
            take: 5,
            select: {
              id: true,
              title: true,
              category: true,
            },
          })
        : [],
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
              recent: documentsRecent,
            },
            training: {
              visible: permissions.canReadOwnTraining || permissions.canReadAllTraining,
              count: trainingsCount,
              recent: trainingsPending,
            },
            routines: {
              visible: permissions.canReadRoutines,
              count: routinesCount,
              recent: routinesRecent,
            },
            forms: {
              visible: permissions.canReadForms,
              count: formsCount,
              recent: formsRecent,
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
