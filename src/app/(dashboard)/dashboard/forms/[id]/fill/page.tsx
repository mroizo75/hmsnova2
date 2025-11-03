import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormFiller } from "@/components/forms/form-filler";

export default async function FillFormPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const form = await prisma.formTemplate.findUnique({
    where: { id, tenantId: session.user.tenantId },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!form || !form.isActive) {
    redirect("/dashboard/forms");
  }

  // Sjekk tilgang
  if (form.accessType === "ROLES") {
    const allowedRoles = form.allowedRoles ? JSON.parse(form.allowedRoles) : [];
    if (!allowedRoles.includes(session.user.role)) {
      redirect("/dashboard/forms");
    }
  } else if (form.accessType === "USERS") {
    const allowedUsers = form.allowedUsers ? JSON.parse(form.allowedUsers) : [];
    if (!allowedUsers.includes(session.user.id)) {
      redirect("/dashboard/forms");
    }
  } else if (form.accessType === "ROLES_AND_USERS") {
    const allowedRoles = form.allowedRoles ? JSON.parse(form.allowedRoles) : [];
    const allowedUsers = form.allowedUsers ? JSON.parse(form.allowedUsers) : [];
    if (!allowedRoles.includes(session.user.role) && !allowedUsers.includes(session.user.id)) {
      redirect("/dashboard/forms");
    }
  }

  return (
    <FormFiller
      form={{
        id: form.id,
        title: form.title,
        description: form.description || undefined,
        requiresSignature: form.requiresSignature,
        requiresApproval: form.requiresApproval,
        fields: form.fields.map((field) => ({
          id: field.id,
          type: field.fieldType,
          label: field.label,
          placeholder: field.placeholder || undefined,
          helpText: field.helpText || undefined,
          isRequired: field.isRequired,
          options: field.options ? JSON.parse(field.options) : undefined,
        })),
      }}
      userId={session.user.id}
      tenantId={session.user.tenantId}
    />
  );
}

