export type TenantEngagementLevel = "high" | "medium" | "low" | "inactive";

export type TenantEngagement = {
  level: TenantEngagementLevel;
  label: string;
  color: string;
  bg: string;
};

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Sist noen faktisk var inne. Aktivitet i appen veier like mye som innlogging. */
export function latestUserActivity(
  lastSeenAt: Date | string | null | undefined,
  lastLoginAttempt: Date | string | null | undefined,
): Date | null {
  const seen = asDate(lastSeenAt);
  const login = asDate(lastLoginAttempt);
  if (seen && login) return seen > login ? seen : login;
  return seen ?? login;
}

export function latestTenantActivity(
  users: Array<{
    lastSeenAt: Date | string | null;
    lastLoginAttempt: Date | string | null;
  }>,
): Date | null {
  return users.reduce<Date | null>((latest, user) => {
    const candidate = latestUserActivity(user.lastSeenAt, user.lastLoginAttempt);
    if (!candidate) return latest;
    if (!latest || candidate > latest) return candidate;
    return latest;
  }, null);
}

export function getTenantEngagement(
  lastActive: Date | null,
  recentIncidents: number,
  recentDocuments: number,
  now = new Date(),
): TenantEngagement {
  const daysSinceActive = lastActive
    ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const totalActivity = recentIncidents + recentDocuments;

  if (daysSinceActive <= 7 && totalActivity >= 3) {
    return { level: "high", label: "Aktiv", color: "text-green-600", bg: "bg-green-600" };
  }
  if (daysSinceActive <= 14 && totalActivity >= 1) {
    return { level: "medium", label: "Moderat", color: "text-yellow-600", bg: "bg-yellow-500" };
  }
  if (daysSinceActive <= 30) {
    return { level: "low", label: "Lav aktivitet", color: "text-orange-500", bg: "bg-orange-500" };
  }
  return { level: "inactive", label: "Inaktiv", color: "text-destructive", bg: "bg-destructive" };
}
