import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { FormFiller } from "@/components/shared/form-filler";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function WellbeingFillPage({ params }: PageProps) {
  const { formId } = await params;
  const session = await getServerSession(authOptions);
  const t = await getTranslations("dashboardWellbeingPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  const formTemplate = await prisma.formTemplate.findFirst({
    where: {
      id: formId,
      category: "WELLBEING",
      OR: [
        { tenantId },
        { isGlobal: true },
      ],
    },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!formTemplate) {
    notFound();
  }

  const form = {
    id: formTemplate.id,
    title: formTemplate.title,
    description: formTemplate.description ?? undefined,
    requiresSignature: formTemplate.requiresSignature,
    requiresApproval: formTemplate.requiresApproval,
    isAnonymous: true,
    fields: formTemplate.fields.map((field) => ({
      id: field.id,
      type: field.fieldType,
      label: field.label,
      placeholder: field.placeholder ?? undefined,
      helpText: field.helpText ?? undefined,
      isRequired: field.isRequired,
      options: field.options ? JSON.parse(field.options as string) : undefined,
    })),
  };

  return (
    <FormFiller
      form={form}
      userId={userId}
      tenantId={tenantId}
      returnUrl="/dashboard/wellbeing"
    />
  );
}
