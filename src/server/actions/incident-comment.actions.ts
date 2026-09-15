"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { canRoleSeeIncident } from "@/lib/incident-visibility";
import type { IncidentType } from "@prisma/client";

function fail(message: string) {
  return { success: false as const, error: message };
}

export async function addIncidentComment(input: {
  incidentId: string;
  body: string;
  kind: "SUBMITTER" | "TREATMENT";
}) {
  const auth = await getAuthContext();
  if (!auth) return fail("Ikke innlogget");

  const body = input.body.trim();
  if (body.length < 2) {
    return fail("Kommentaren må være minst 2 tegn");
  }

  const incident = await prisma.incident.findFirst({
    where: { id: input.incidentId, tenantId: auth.tenantId },
    select: { id: true, reportedBy: true, type: true, subcategoryKeys: true },
  });
  if (!incident) return fail("Avviket ble ikke funnet");

  const reporter = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: incident.reportedBy, tenantId: auth.tenantId } },
    select: { departmentId: true },
  });

  const visible = canRoleSeeIncident({
    role: auth.role,
    canReadIncidents: auth.permissions.canReadIncidents,
    canReadOwnIncidents: auth.permissions.canReadOwnIncidents,
    viewerId: auth.userId,
    reportedBy: incident.reportedBy,
    type: incident.type as IncidentType,
    subcategoryKeysRaw: incident.subcategoryKeys,
    reporterDepartmentId: reporter?.departmentId ?? null,
    viewerDepartmentId: auth.departmentId,
  });
  if (!visible) return fail("Du har ikke tilgang til dette avviket");

  if (input.kind === "TREATMENT" && !auth.permissions.canInvestigateIncidents) {
    return fail("Kun behandlere kan legge inn interne merknader");
  }
  if (input.kind === "SUBMITTER" && incident.reportedBy !== auth.userId) {
    return fail("Kun innsender kan legge inn innsenderkommentar etter registrering");
  }

  await prisma.incidentComment.create({
    data: {
      incidentId: incident.id,
      authorId: auth.userId,
      body,
      kind: input.kind,
    },
  });

  revalidatePath(`/dashboard/incidents/${incident.id}`);
  revalidatePath("/ansatt/avvik");
  revalidatePath(`/ansatt/avvik/${incident.id}`);
  return { success: true as const };
}
