"use server";

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const FieldSchema = z
  .object({
    label: z.string().trim().min(1).max(300),
    fieldType: z.enum(["LIKERT_SCALE", "RADIO", "TEXTAREA", "SECTION_HEADER"]),
    helpText: z.string().trim().max(500).optional(),
    isRequired: z.boolean(),
    options: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.fieldType === "RADIO" && (field.options?.length ?? 0) < 2) {
      ctx.addIssue({ code: "custom", message: "Valg trenger minst to alternativer" });
    }
  });

const CreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  tenantId: z.string().min(1).optional().or(z.literal("")),
  fields: z.array(FieldSchema).min(1, "Legg inn minst ett spørsmål").max(80),
});

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join(". ");
  if (error instanceof Error) return error.message;
  return fallback;
}

async function requireStaff() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isSuperAdmin: true, isSupport: true },
  });
  if (!user?.isSuperAdmin && !user?.isSupport) return null;
  return user;
}

export async function listSuperadminWellbeingForms() {
  const staff = await requireStaff();
  if (!staff) return { success: false as const, error: "Ingen tilgang" };

  const [forms, tenants] = await Promise.all([
    prisma.formTemplate.findMany({
      where: { category: "WELLBEING" },
      include: {
        tenant: { select: { id: true, name: true } },
        _count: { select: { fields: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.tenant.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return {
    success: true as const,
    forms: forms.map((form) => ({
      id: form.id,
      title: form.title,
      description: form.description,
      isActive: form.isActive,
      isGlobal: form.isGlobal,
      tenantName: form.tenant?.name ?? null,
      fieldCount: form._count.fields,
    })),
    tenants,
  };
}

export async function createSuperadminWellbeingForm(input: {
  title: string;
  description?: string;
  tenantId?: string;
  fields: Array<{
    label: string;
    fieldType: "LIKERT_SCALE" | "RADIO" | "TEXTAREA" | "SECTION_HEADER";
    helpText?: string;
    isRequired: boolean;
    options?: string[];
  }>;
}) {
  try {
    const staff = await requireStaff();
    if (!staff) throw new Error("Ingen tilgang");
    const data = CreateSchema.parse(input);
    const tenantId = data.tenantId || null;
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
      if (!tenant) throw new Error("Bedriften finnes ikke");
    }

    await prisma.formTemplate.create({
      data: {
        tenantId,
        isGlobal: tenantId === null,
        title: data.title,
        description: data.description || null,
        category: "WELLBEING",
        isActive: true,
        requiresSignature: false,
        requiresApproval: false,
        allowAnonymousResponses: true,
        allowTenantDeletion: false,
        createdBy: staff.id,
        fields: {
          create: data.fields.map((field, index) => ({
            fieldType: field.fieldType,
            label: field.label,
            helpText: field.helpText || null,
            isRequired: field.fieldType === "SECTION_HEADER" ? false : field.isRequired,
            order: index + 1,
            options:
              field.fieldType === "RADIO" && field.options && field.options.length > 0
                ? JSON.stringify(field.options)
                : null,
          })),
        },
      },
    });

    revalidatePath("/admin/psykososialt");
    revalidatePath("/dashboard/wellbeing");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre skjemaet") };
  }
}

export async function setSuperadminWellbeingFormActive(input: { id: string; isActive: boolean }) {
  try {
    const staff = await requireStaff();
    if (!staff) throw new Error("Ingen tilgang");
    const form = await prisma.formTemplate.findFirst({
      where: { id: input.id, category: "WELLBEING" },
      select: { id: true },
    });
    if (!form) throw new Error("Skjemaet finnes ikke");
    await prisma.formTemplate.update({
      where: { id: form.id },
      data: { isActive: input.isActive },
    });
    revalidatePath("/admin/psykososialt");
    revalidatePath("/dashboard/wellbeing");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke oppdatere skjemaet") };
  }
}
