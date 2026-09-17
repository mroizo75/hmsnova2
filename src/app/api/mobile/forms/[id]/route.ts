import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveEffectivePermissions } from "@/lib/server-authorization";

const parseOptions = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const { id } = await context.params;
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
    if (!permissions.canReadForms && !permissions.canFillForms) {
      return NextResponse.json({ error: "Ingen tilgang til skjema" }, { status: 403 });
    }

    const form = await prisma.formTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ tenantId: session.user.tenantId }, { isGlobal: true, tenantId: null }],
      },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Skjema ikke funnet" }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        category: form.category,
        requiresSignature: form.requiresSignature,
        fields: form.fields.map((field) => ({
          id: field.id,
          fieldType: field.fieldType,
          label: field.label,
          helpText: field.helpText,
          placeholder: field.placeholder,
          isRequired: field.isRequired,
          options: parseOptions(field.options),
        })),
      },
    });
  } catch (error) {
    console.error("[Mobile Form Detail] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente skjema" }, { status: 500 });
  }
}
