import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const form = await prisma.formTemplate.create({
      data: {
        tenantId: body.tenantId,
        title: body.title,
        description: body.description,
        category: body.category || "CUSTOM",
        requiresSignature: body.requiresSignature ?? true,
        requiresApproval: body.requiresApproval ?? false,
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

    const body = await request.json();

    // Slett eksisterende felter
    await prisma.formField.deleteMany({
      where: { formTemplateId: body.id },
    });

    // Oppdater skjema med nye felter
    const form = await prisma.formTemplate.update({
      where: { id: body.id },
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        requiresSignature: body.requiresSignature,
        requiresApproval: body.requiresApproval,
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

