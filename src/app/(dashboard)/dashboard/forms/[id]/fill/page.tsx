import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FormFiller } from "@/components/forms/form-filler";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldX } from "lucide-react";
import Link from "next/link";

function AccessDenied({
  title,
  message,
  returnUrl,
}: {
  title: string;
  message: string;
  returnUrl: string;
}) {
  return (
    <div className="max-w-lg mx-auto mt-16 text-center space-y-6">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">{message}</p>
      </div>
      <Link href={returnUrl}>
        <Button variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Gå tilbake
        </Button>
      </Link>
    </div>
  );
}

export default async function FillFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inspectionId?: string; returnUrl?: string; projectId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const { inspectionId, returnUrl: returnUrlParam, projectId } = await searchParams;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const returnUrl = inspectionId
    ? `/dashboard/inspections/${inspectionId}`
    : (returnUrlParam ?? "/dashboard/forms");

  const form = await prisma.formTemplate.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!form) {
    return (
      <AccessDenied
        title="Skjema ikke funnet"
        message={`Skjema-ID «${id}» finnes ikke i databasen. Det kan ha blitt slettet.`}
        returnUrl={returnUrl}
      />
    );
  }

  if (!form.isActive) {
    return (
      <AccessDenied
        title="Skjema er inaktivt"
        message={`Skjemaet «${form.title}» er deaktivert og kan ikke fylles ut.`}
        returnUrl={returnUrl}
      />
    );
  }

  if (form.tenantId && form.tenantId !== session.user.tenantId) {
    return (
      <AccessDenied
        title="Feil virksomhet"
        message="Dette skjemaet tilhører en annen virksomhet enn din aktive sesjon."
        returnUrl={returnUrl}
      />
    );
  }

  // Privilegerte roller (skjemaeier, admin, HMS) kan alltid fylle ut uansett tilgangskontroll
  const privilegedRoles = ["ADMIN", "HMS", "LEDER"];
  const isPrivileged =
    form.createdBy === session.user.id ||
    (session.user.role != null && privilegedRoles.includes(session.user.role));

  if (!isPrivileged) {
    let hasAccess = true;
    let accessDeniedReason = "";

    if (form.accessType === "ROLES") {
      const allowedRoles: string[] = form.allowedRoles ? JSON.parse(form.allowedRoles) : [];
      if (allowedRoles.length === 0) {
        hasAccess = false;
        accessDeniedReason = `Skjemaet «${form.title}» er satt til rollebasert tilgang, men ingen roller er lagt til. Be en administrator redigere tilgangen.`;
      } else if (!session.user.role || !allowedRoles.includes(session.user.role)) {
        hasAccess = false;
        accessDeniedReason = `Din rolle (${session.user.role ?? "ukjent"}) har ikke tilgang til skjemaet «${form.title}». Tillatte roller: ${allowedRoles.join(", ")}.`;
      }
    } else if (form.accessType === "USERS") {
      const allowedUsers: string[] = form.allowedUsers ? JSON.parse(form.allowedUsers) : [];
      if (!allowedUsers.includes(session.user.id)) {
        hasAccess = false;
        accessDeniedReason = `Du er ikke på listen over brukere som har tilgang til skjemaet «${form.title}».`;
      }
    } else if (form.accessType === "ROLES_AND_USERS") {
      const allowedRoles: string[] = form.allowedRoles ? JSON.parse(form.allowedRoles) : [];
      const allowedUsers: string[] = form.allowedUsers ? JSON.parse(form.allowedUsers) : [];
      const roleOk = session.user.role ? allowedRoles.includes(session.user.role) : false;
      const userOk = allowedUsers.includes(session.user.id);
      if (!roleOk && !userOk) {
        hasAccess = false;
        accessDeniedReason = `Verken din rolle eller bruker har tilgang til skjemaet «${form.title}».`;
      }
    }

    if (!hasAccess) {
      return (
        <AccessDenied
          title="Ingen tilgang"
          message={accessDeniedReason}
          returnUrl={returnUrl}
        />
      );
    }
  }

  const isAnonymous =
    form.category === "WELLBEING" || form.allowAnonymousResponses;

  const projects = await prisma.project.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

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
