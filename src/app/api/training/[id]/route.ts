import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: Context) {
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
      membership.role as Role
    );
    if (!permissions.canReadOwnTraining && !permissions.canReadAllTraining) {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json({ error: "Mangler opplarings-id" }, { status: 400 });
    }

    const training = await prisma.training.findFirst({
      where: {
        id: id.trim(),
        tenantId: session.user.tenantId,
        ...(permissions.canReadAllTraining ? {} : { userId: session.user.id }),
      },
      select: {
        id: true,
        courseKey: true,
        title: true,
        provider: true,
        description: true,
        completedAt: true,
        validUntil: true,
        proofDocKey: true,
        isRequired: true,
        evaluatedBy: true,
        evaluatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!training) {
      return NextResponse.json({ error: "Opplaring ikke funnet" }, { status: 404 });
    }

    return NextResponse.json({ training }, { status: 200 });
  } catch (error) {
    console.error("Get training detail error:", error);
    return NextResponse.json({ error: "Kunne ikke hente opplaring" }, { status: 500 });
  }
}
