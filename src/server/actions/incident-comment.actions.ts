"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { viewerCanSeeIncident } from "@/server/lib/incident-access";
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
    select: {
      id: true,
      reportedBy: true,
      type: true,
      subcategoryKeys: true,
      departmentId: true,
      responsibleId: true,
      projectId: true,
    },
  });
  if (!incident) return fail("Avviket ble ikke funnet");

  const visible = await viewerCanSeeIncident({
    role: auth.role,
    tenantId: auth.tenantId,
    userId: auth.userId,
    canReadIncidents: auth.permissions.canReadIncidents,
    canReadOwnIncidents: auth.permissions.canReadOwnIncidents,
    departmentId: auth.departmentId,
    incident: {
      reportedBy: incident.reportedBy,
      type: incident.type as IncidentType,
      subcategoryKeys: incident.subcategoryKeys,
      departmentId: incident.departmentId,
      responsibleId: incident.responsibleId,
      projectId: incident.projectId,
    },
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
