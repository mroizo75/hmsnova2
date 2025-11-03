import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormBuilder } from "@/components/forms/form-builder";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const form = await prisma.formTemplate.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!form || form.tenantId !== session.user.tenantId) {
    redirect("/dashboard/forms");
  }

  // Transform data for form builder
  const initialData = {
    id: form.id,
    title: form.title,
    description: form.description || "",
    category: form.category,
    requiresSignature: form.requiresSignature,
    requiresApproval: form.requiresApproval,
    accessType: form.accessType,
    allowedRoles: form.allowedRoles ? JSON.parse(form.allowedRoles) : [],
    allowedUsers: form.allowedUsers ? JSON.parse(form.allowedUsers) : [],
    fields: form.fields.map((field) => ({
      id: field.id,
      type: field.fieldType,
      label: field.label,
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      isRequired: field.isRequired,
      order: field.order,
      options: field.options ? JSON.parse(field.options) : undefined,
    })),
  };

  return (
    <div>
      <FormBuilder tenantId={session.user.tenantId} initialData={initialData} />
    </div>
  );
}

