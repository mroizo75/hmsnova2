import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import {
  resolveIncidentRecipients,
  type IncidentRoutingLookups,
} from "@/lib/incident-notification-routing";
import { createNotification } from "@/server/actions/notification.actions";

/**
 * Databaseoppslagene for varslingshierarkiet. Alle oppslag er låst til én tenant, slik at
 * en leder i en annen virksomhet aldri kan bli mottaker (GDPR art. 5 (1) f).
 */
export function createIncidentRoutingLookups(tenantId: string): IncidentRoutingLookups {
  const isMemberOfTenant = async (userId: string): Promise<boolean> => {
    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { id: true },
    });
    return membership !== null;
  };

  return {
    async getProjectManagerId(projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
        select: { projectManagerId: true },
      });

      if (!project?.projectManagerId) return null;
      return (await isMemberOfTenant(project.projectManagerId))
        ? project.projectManagerId
        : null;
    },

    async getManagerId(userId) {
      const membership = await prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
        select: { managerId: true },
      });

      if (!membership?.managerId) return null;
      return (await isMemberOfTenant(membership.managerId)) ? membership.managerId : null;
    },

    async getUserIdsByRoles(roles) {
      if (roles.length === 0) return [];

      const memberships = await prisma.userTenant.findMany({
        where: { tenantId, role: { in: roles as Role[] } },
        select: { userId: true },
        distinct: ["userId"],
      });

      return memberships.map((membership) => membership.userId);
    },
  };
}

interface DispatchNewIncidentNotificationsInput {
  tenantId: string;
  reporterId: string;
  projectId: string | null;
  fallbackRoles: readonly string[];
  incidentId: string;
  title: string;
  typeLabel: string;
}

/**
 * Varsler nærmeste ansvarlige for et nytt avvik etter kaskaden i
 * resolveIncidentRecipients, med HMS-ansvarlige på kopi.
 */
export async function dispatchNewIncidentNotifications(
  input: DispatchNewIncidentNotificationsInput
) {
  const routing = await resolveIncidentRecipients(
    {
      reporterId: input.reporterId,
      projectId: input.projectId,
      fallbackRoles: input.fallbackRoles,
    },
    createIncidentRoutingLookups(input.tenantId)
  );

  const link = `/dashboard/incidents/${input.incidentId}`;
  const message = `${input.typeLabel}: ${input.title}`;

  await Promise.all([
    ...routing.recipientIds.map((userId) =>
      createNotification({
        tenantId: input.tenantId,
        userId,
        type: "NEW_INCIDENT",
        title: "Nytt avvik til behandling",
        message,
        link,
      })
    ),
    ...routing.copyRecipientIds.map((userId) =>
      createNotification({
        tenantId: input.tenantId,
        userId,
        type: "NEW_INCIDENT",
        title: "Nytt avvik registrert (kopi)",
        message,
        link,
      })
    ),
  ]);

  return routing;
}
