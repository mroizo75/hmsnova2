import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormFiller } from "@/components/forms/form-filler";

export default async function AnsattFillFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inspectionId?: string; projectId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const { inspectionId, projectId } = await searchParams;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent brukerens rolle
  const userTenant = await prisma.userTenant.findUnique({
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

  const userRole = userTenant?.role || "ANSATT";
  const userId = session.user.id;

  const form = await prisma.formTemplate.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!form || !form.isActive) {
    redirect("/ansatt/skjemaer");
  }

  // Sjekk at skjemaet enten er globalt eller tilhører tenant
  if (form.tenantId && form.tenantId !== session.user.tenantId) {
    redirect("/ansatt/skjemaer");
  }

  // Sjekk tilgangskontroll
  let hasAccess = false;

  if (form.accessType === "ALL") {
    hasAccess = true;
  } else if (form.accessType === "ROLES" && form.allowedRoles) {
    try {
      const allowedRoles = JSON.parse(form.allowedRoles);
      hasAccess = allowedRoles.includes(userRole);
    } catch {
      hasAccess = false;
    }
  } else if (form.accessType === "USERS" && form.allowedUsers) {
    try {
      const allowedUsers = JSON.parse(form.allowedUsers);
      hasAccess = allowedUsers.includes(userId);
    } catch {
      hasAccess = false;
    }
  } else if (form.accessType === "ROLES_AND_USERS") {
    try {
      const allowedRoles = form.allowedRoles ? JSON.parse(form.allowedRoles) : [];
      const allowedUsers = form.allowedUsers ? JSON.parse(form.allowedUsers) : [];
      hasAccess = allowedRoles.includes(userRole) || allowedUsers.includes(userId);
    } catch {
      hasAccess = false;
    }
  }

  if (!hasAccess) {
    redirect("/ansatt/skjemaer");
  }

  const isAnonymous =
    form.category === "WELLBEING" || form.allowAnonymousResponses;

  const projects = await prisma.project.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const returnUrl = inspectionId ? `/ansatt/vernerunder` : "/ansatt/skjemaer";

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
        isAnonymous,
      }}
      userId={session.user.id}
      tenantId={session.user.tenantId}
      returnUrl={returnUrl}
      inspectionId={inspectionId}
      projects={projects}
      initialProjectId={projectId}
    />
  );
}

