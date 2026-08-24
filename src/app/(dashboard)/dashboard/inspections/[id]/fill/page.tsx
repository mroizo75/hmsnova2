import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormFiller } from "@/components/shared/form-filler";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FillInspectionFormPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  const inspection = await prisma.inspection.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      formTemplate: {
        include: {
          fields: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!inspection || !inspection.formTemplate) {
    notFound();
  }

  const { formTemplate } = inspection;

  const form = {
    id: formTemplate.id,
    title: formTemplate.title,
    description: formTemplate.description ?? undefined,
    requiresSignature: formTemplate.requiresSignature,
    requiresApproval: formTemplate.requiresApproval,
    isAnonymous: formTemplate.allowAnonymousResponses,
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
      inspectionId={inspection.id}
      returnUrl={`/dashboard/inspections/${id}`}
    />
  );
}
