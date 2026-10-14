import { prisma } from "@/lib/db";
import {
  pickDepartmentLeaderIds,
  resolveIncidentRecipients,
  type IncidentRoutingLookups,
} from "@/lib/incident-notification-routing";
import { roleMatchFilter } from "@/lib/extra-roles";
import { createNotification } from "@/server/actions/notification.actions";
import {
  buildIncidentReporterNotification,
  shouldNotifyIncidentReporter,
  type IncidentReporterEvent,
} from "@/lib/incident-reporter-notify";

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

    async getDepartmentLeaderIds(departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: departmentId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!department) return [];

      const placed = await prisma.userTenant.findMany({
        where: { tenantId, departmentId, role: "LEDER" },
        select: { userId: true },
      });
      const members = await prisma.userTenant.findMany({
        where: { tenantId, departmentId, managerId: { not: null } },
        select: { managerId: true },
      });
      const managerIds = members
        .map((member) => member.managerId)
        .filter((managerId): managerId is string => Boolean(managerId));
      const managerLeaders = managerIds.length
        ? await prisma.userTenant.findMany({
            where: { tenantId, userId: { in: managerIds }, role: "LEDER" },
            select: { userId: true },
          })
        : [];

      return pickDepartmentLeaderIds({
        leadersInDepartment: placed.map((leader) => leader.userId),
        managersOfMembers: managerLeaders.map((leader) => leader.userId),
      });
    },

    async getUserIdsByRoles(roles) {
      if (roles.length === 0) return [];

      const memberships = await prisma.userTenant.findMany({
        where: { tenantId, ...roleMatchFilter(roles) },
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
  departmentId?: string | null;
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
      departmentId: input.departmentId ?? null,
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

export async function notifyIncidentReporter(opts: {
  tenantId: string;
  incidentId: string;
  reportedBy: string;
  actorId: string;
  title: string;
  typeLabel: string;
  event: IncidentReporterEvent;
  statusLabel?: string;
}) {
  if (!shouldNotifyIncidentReporter({ reportedBy: opts.reportedBy, actorId: opts.actorId })) {
    return;
  }

  const payload = buildIncidentReporterNotification({
    event: opts.event,
    incidentId: opts.incidentId,
    typeLabel: opts.typeLabel,
    title: opts.title,
    statusLabel: opts.statusLabel,
  });

  await createNotification({
    tenantId: opts.tenantId,
    userId: opts.reportedBy,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link,
  });
}
