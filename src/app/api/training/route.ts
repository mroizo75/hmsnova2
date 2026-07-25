import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";
import { Role } from "@prisma/client";

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

    const permissions = await resolveEffectivePermissions(
      session.user.tenantId,
      membership.role as Role
    );
    if (!permissions.canReadOwnTraining && !permissions.canReadAllTraining) {
      return NextResponse.json({ trainings: [] }, { status: 200 });
    }

    const trainings = await prisma.training.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(permissions.canReadAllTraining ? {} : { userId: session.user.id }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
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
      },
    });

    return NextResponse.json({ trainings }, { status: 200 });
  } catch (error) {
    console.error("Get training error:", error);
    return NextResponse.json({ error: "Kunne ikke hente opplæring" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Ikke autorisert" },
        { status: 401 }
      );
    }

    // Sjekk permissions (create påvirkes ikke av modul-synlighet, men bruk samme kilde)
    const userRole = session.user.role as Role;
    const permissions = await resolveEffectivePermissions(
      session.user.tenantId,
      userRole
    );

    if (!permissions.canCreateTraining) {
      return NextResponse.json(
        { error: "Du har ikke tilgang til å opprette opplæring" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      provider,
      completedAt,
      proofDocKey,
      isRequired,
      effectiveness,
    } = body;

    // Valider påkrevde felt
    if (!title || !completedAt) {
      return NextResponse.json(
        { error: "Tittel og gjennomført dato er påkrevd" },
        { status: 400 }
      );
    }

    // Opprett opplæring
    const training = await prisma.training.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        title,
        description: description || null,
        provider: provider || "Egendefinert",
        completedAt: new Date(completedAt),
        proofDocKey: proofDocKey || null,
        isRequired: isRequired || false,
        effectiveness: effectiveness !== undefined ? effectiveness : null,
        courseKey: `${session.user.tenantId}-${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      },
    });

    return NextResponse.json(training, { status: 201 });
  } catch (error) {
    console.error("Create training error:", error);
    return NextResponse.json(
      { error: "Kunne ikke opprette opplæring" },
      { status: 500 }
    );
  }
}
