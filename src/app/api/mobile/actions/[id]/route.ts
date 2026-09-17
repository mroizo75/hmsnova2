import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { ActionStatus, Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

const allowedStatuses: ActionStatus[] = ["PENDING", "IN_PROGRESS", "DONE", "OVERDUE"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id er obligatorisk" }, { status: 400 });
    }

    const body = (await request.json()) as { status?: string };
    if (!body.status || !allowedStatuses.includes(body.status as ActionStatus)) {
      return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
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

    const existing = await prisma.measure.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: { id: true, responsibleId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tiltak ikke funnet" }, { status: 404 });
    }

    const isOwner = existing.responsibleId === session.user.id;
    if (!isOwner && !permissions.canUpdateActions) {
      return NextResponse.json({ error: "Ingen tilgang til å oppdatere tiltaket" }, { status: 403 });
    }

    const status = body.status as ActionStatus;
    const updated = await prisma.measure.update({
      where: { id: existing.id },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ action: updated }, { status: 200 });
  } catch (error) {
    console.error("[Mobile Actions Patch] Error:", error);
    return NextResponse.json({ error: "Kunne ikke oppdatere tiltak" }, { status: 500 });
  }
}
