export const REGISTRATION_QUEUE_PAGE_SIZE = 20;
export const NEW_GROUP_WINDOW_DAYS = 30;
export const NEW_ONBOARDING_STATUSES = ["NOT_STARTED", "IN_PROGRESS"] as const;

export type QueueKeyKind = "tenant" | "group";

export type RegistrationQueueKey = {
  kind: QueueKeyKind;
  id: string;
  createdAt: Date;
};

export function isNewOnboardingStatus(status: string): boolean {
  return (NEW_ONBOARDING_STATUSES as readonly string[]).includes(status);
}

export function mergeRegistrationQueueKeys(
  tenants: Array<{ id: string; createdAt: Date }>,
  groups: Array<{ id: string; createdAt: Date }>,
): RegistrationQueueKey[] {
  return [
    ...tenants.map((tenant) => ({
      kind: "tenant" as const,
      id: tenant.id,
      createdAt: tenant.createdAt,
    })),
    ...groups.map((group) => ({
      kind: "group" as const,
      id: group.id,
      createdAt: group.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function paginateQueue<T>(items: T[], page: number, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    totalItems,
    totalPages,
    currentPage,
    items: items.slice(start, start + pageSize),
  };
}

export function countPendingGroupMembers(
  members: Array<{ onboardingStatus: string }>,
): number {
  return members.filter((member) => isNewOnboardingStatus(member.onboardingStatus)).length;
}

export function companyAdminHref(onboardingStatus: string, tenantId: string): string {
  if (isNewOnboardingStatus(onboardingStatus)) {
    return `/admin/registrations/${tenantId}`;
  }
  return `/admin/tenants/${tenantId}`;
}
