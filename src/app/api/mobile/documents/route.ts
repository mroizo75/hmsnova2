import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

const isVisibleForRole = (visibleToRoles: unknown, role: Role): boolean => {
  if (!visibleToRoles) {
    return true;
  }

  if (Array.isArray(visibleToRoles)) {
    return visibleToRoles.includes(role);
  }

  if (typeof visibleToRoles === "string") {
    try {
      const parsed = JSON.parse(visibleToRoles) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.includes(role);
      }
    } catch {
      return true;
    }
  }

  return true;
};

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
    if (!permissions.canReadDocuments) {
      return NextResponse.json({ documents: [] }, { status: 200 });
    }

    const documents = await prisma.document.findMany({
      where: {
        tenantId: session.user.tenantId,
        status: "APPROVED",
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        visibleToRoles: true,
        updatedAt: true,
      },
    });

    const scopedDocuments = documents.filter((document) => isVisibleForRole(document.visibleToRoles, role));
    return NextResponse.json({ documents: scopedDocuments }, { status: 200 });
  } catch (error) {
    console.error("[Mobile Documents] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente dokumenter" }, { status: 500 });
  }
}
