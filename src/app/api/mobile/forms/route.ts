import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";

const roleAllowed = (allowedRoles: string | null, role: Role): boolean => {
  if (!allowedRoles) {
    return true;
  }

  try {
    const parsed = JSON.parse(allowedRoles) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return true;
    }
    return parsed.includes(role);
  } catch {
    return true;
  }
};

const userAllowed = (allowedUsers: string | null, userId: string): boolean => {
  if (!allowedUsers) {
    return true;
  }

  try {
    const parsed = JSON.parse(allowedUsers) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return true;
    }
    return parsed.includes(userId);
  } catch {
    return true;
  }
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
    const permissions = getPermissions(role);
    if (!permissions.canReadForms) {
      return NextResponse.json({ forms: [] }, { status: 200 });
    }

    const forms = await prisma.formTemplate.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
      },
      orderBy: {
        title: "asc",
      },
      take: 100,
      select: {
        id: true,
        title: true,
        category: true,
        accessType: true,
        allowedRoles: true,
        allowedUsers: true,
      },
    });

    const scopedForms = forms.filter((form) => {
      if (!roleAllowed(form.allowedRoles, role)) {
        return false;
      }
      if (!userAllowed(form.allowedUsers, session.user.id)) {
        return false;
      }
      return true;
    });

    return NextResponse.json({ forms: scopedForms }, { status: 200 });
  } catch (error) {
    console.error("[Mobile Forms] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente skjemaer" }, { status: 500 });
  }
}
