import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tenantCanUseGlobalFormTemplate } from "@/lib/form-template-industry";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ forms: [] });
    }

    // Hent category fra query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const showAll = searchParams.get("view") === "all";

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
    if (showAll) {
      return NextResponse.json({ forms });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });
    const scopedForms = forms.filter((form) =>
      tenantCanUseGlobalFormTemplate(form, tenant?.industry ?? null, {
        allTemplatesView: showAll,
      })
    );

    return NextResponse.json({ forms: scopedForms });
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
      select: {
        id: true,
        allowTenantDeletion: true,
        fields: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });
    if (!existingForm) {
      return NextResponse.json({ error: "Ingen tilgang til skjema" }, { status: 403 });
    }

    if (existingForm.allowTenantDeletion === false) {
      return NextResponse.json(
        { error: "Bransje- eller systemmaler kan ikke endres. Kopier skjemaet for å tilpasse." },
        { status: 403 }
      );
    }

    const incomingFields: Array<{
      id?: string;
      type: string;
      label: string;
      placeholder?: string;
      helpText?: string;
      isRequired?: boolean;
      order?: number;
      options?: unknown;
    }> = Array.isArray(body.fields) ? body.fields : [];

    const existingFieldIds = new Set(existingForm.fields.map((field) => field.id));
    const incomingExistingFieldIds = incomingFields
      .map((field) => (typeof field.id === "string" ? field.id : undefined))
      .filter((id): id is string => !!id && existingFieldIds.has(id));

    const removedFieldIds = existingForm.fields
      .map((field) => field.id)
      .filter((id) => !incomingExistingFieldIds.includes(id));

    if (removedFieldIds.length > 0) {
      const removedFieldValueCounts = await prisma.formFieldValue.groupBy({
        by: ["fieldId"],
        where: {
          fieldId: { in: removedFieldIds },
        },
        _count: { fieldId: true },
      });

      if (removedFieldValueCounts.length > 0) {
        const removedFieldLabelMap = new Map(
          existingForm.fields.map((field) => [field.id, field.label])
        );
        const blockedFields = removedFieldValueCounts.map(
          (entry) => removedFieldLabelMap.get(entry.fieldId) ?? "Ukjent felt"
        );
        return NextResponse.json(
          {
            error:
              "Kan ikke slette felter som er brukt i innsendinger. Endre feltet i stedet.",
            details: blockedFields,
          },
          { status: 400 }
        );
      }
    }

    const form = await prisma.$transaction(async (tx) => {
      await tx.formTemplate.update({
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
        },
      });

      for (let index = 0; index < incomingFields.length; index += 1) {
        const field = incomingFields[index];
        const nextOrder = typeof field.order === "number" ? field.order : index;
        const data = {
          fieldType: field.type as any,
          label: field.label,
          placeholder: field.placeholder,
          helpText: field.helpText,
          isRequired: !!field.isRequired,
          order: nextOrder,
          options: Array.isArray(field.options) ? JSON.stringify(field.options) : null,
        };

        if (field.id && existingFieldIds.has(field.id)) {
          await tx.formField.update({
            where: { id: field.id },
            data,
          });
        } else {
          await tx.formField.create({
            data: {
              ...data,
              formTemplateId: existingForm.id,
            },
          });
        }
      }

      if (removedFieldIds.length > 0) {
        await tx.formField.deleteMany({
          where: { id: { in: removedFieldIds } },
        });
      }

      return tx.formTemplate.findUniqueOrThrow({
        where: { id: existingForm.id },
        include: {
          fields: {
            orderBy: { order: "asc" },
          },
        },
      });
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
