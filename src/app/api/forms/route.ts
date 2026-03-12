import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hent tenantId fra session
    const userTenants = await prisma.userTenant.findMany({
      where: { userId: session.user.id },
    });

    if (userTenants.length === 0) {
      return NextResponse.json({ forms: [] });
    }

    const tenantId = userTenants[0].tenantId;

    // Hent category fra query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    // Bygg where-clause - hent både tenant-spesifikke og globale skjemaer
    const where: any = {
      OR: [
        { tenantId, isActive: true },
        { isGlobal: true, isActive: true },
      ],
    };

    // Filtrer på kategori hvis spesifisert
    if (category) {
      where.category = category;
    }

    const forms = await prisma.formTemplate.findMany({
      where,
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ forms });
  } catch (error: any) {
    console.error("Get forms error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userTenant = await prisma.userTenant.findFirst({
      where: { userId: session.user.id },
      select: { tenantId: true },
    });
    if (!userTenant) {
      return NextResponse.json({ error: "Ingen tenant tilgang" }, { status: 403 });
    }

    const body = await request.json();

    const form = await prisma.formTemplate.create({
      data: {
        tenantId: userTenant.tenantId,
        title: body.title,
        description: body.description,
        numberPrefix: body.numberPrefix ?? null,
        category: body.category || "CUSTOM",
        requiresSignature: body.requiresSignature ?? true,
        requiresApproval: body.requiresApproval ?? false,
        allowAnonymousResponses: body.allowAnonymousResponses ?? (body.category === "WELLBEING"),
        accessType: body.accessType || "ALL",
        allowedRoles: body.allowedRoles ? JSON.stringify(body.allowedRoles) : null,
        allowedUsers: body.allowedUsers ? JSON.stringify(body.allowedUsers) : null,
        createdBy: session.user.id,
        fields: {
          create: body.fields.map((field: any) => ({
            fieldType: field.type,
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            isRequired: field.isRequired,
            order: field.order,
            options: field.options ? JSON.stringify(field.options) : null,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    return NextResponse.json({ success: true, form }, { status: 201 });
  } catch (error: any) {
    console.error("Create form error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userTenant = await prisma.userTenant.findFirst({
      where: { userId: session.user.id },
      select: { tenantId: true },
    });
    if (!userTenant) {
      return NextResponse.json({ error: "Ingen tenant tilgang" }, { status: 403 });
    }

    const body = await request.json();
    const existingForm = await prisma.formTemplate.findFirst({
      where: {
        id: body.id,
        tenantId: userTenant.tenantId,
        isGlobal: false,
      },
      select: { id: true },
    });
    if (!existingForm) {
      return NextResponse.json({ error: "Ingen tilgang til skjema" }, { status: 403 });
    }

    // Slett eksisterende felter
    await prisma.formField.deleteMany({
      where: { formTemplateId: existingForm.id },
    });

    // Oppdater skjema med nye felter
    const form = await prisma.formTemplate.update({
      where: { id: existingForm.id },
      data: {
        title: body.title,
        description: body.description,
        numberPrefix: body.numberPrefix ?? null,
        category: body.category,
        requiresSignature: body.requiresSignature,
        requiresApproval: body.requiresApproval,
        allowAnonymousResponses: body.allowAnonymousResponses,
        accessType: body.accessType,
        allowedRoles: body.allowedRoles ? JSON.stringify(body.allowedRoles) : null,
        allowedUsers: body.allowedUsers ? JSON.stringify(body.allowedUsers) : null,
        fields: {
          create: body.fields.map((field: any) => ({
            fieldType: field.type,
            label: field.label,
            placeholder: field.placeholder,
            helpText: field.helpText,
            isRequired: field.isRequired,
            order: field.order,
            options: field.options ? JSON.stringify(field.options) : null,
          })),
        },
      },
      include: {
        fields: true,
      },
    });

    return NextResponse.json({ success: true, form });
  } catch (error: any) {
    console.error("Update form error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
