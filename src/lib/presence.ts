import { prisma } from "@/lib/db";
import { latestUserActivity } from "@/lib/tenant-engagement";

export const PRESENCE_WINDOW_MS = 5 * 60 * 1000;
export const LOGGED_IN_WINDOW_MS = 12 * 60 * 60 * 1000;
export const PRESENCE_LIST_LIMIT = 8;
const PRESENCE_TOUCH_THROTTLE_MS = 45 * 1000;

export async function touchUserPresence(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - PRESENCE_TOUCH_THROTTLE_MS);
  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }],
    },
    data: { lastSeenAt: new Date() },
  });
}

export type OnlinePresenceUser = {
  id: string;
  name: string | null;
  email: string;
  isStaff: boolean;
  lastSeenAt: Date;
  companies: string[];
};

export type PresenceCandidate = {
  lastSeenAt: Date | null;
  lastLoginAttempt: Date | null;
};

export type OnlinePresenceSnapshot = {
  onlineCustomerCount: number;
  onlineStaffCount: number;
  loggedInCustomerCount: number;
  loggedInStaffCount: number;
  safeToUpgrade: boolean;
  windowMinutes: number;
  loggedInWindowHours: number;
  listLimit: number;
  activeUsers: OnlinePresenceUser[];
  idleUsers: OnlinePresenceUser[];
  hiddenActiveCount: number;
  hiddenIdleCount: number;
};

export function isPresenceActive(lastSeenAt: Date | null, now = new Date()): boolean {
  if (!lastSeenAt) return false;
  return now.getTime() - lastSeenAt.getTime() <= PRESENCE_WINDOW_MS;
}

export function isPresenceLoggedIn(user: PresenceCandidate, now = new Date()): boolean {
  const activity = latestUserActivity(user.lastSeenAt, user.lastLoginAttempt);
  if (!activity) return false;
  return now.getTime() - activity.getTime() <= LOGGED_IN_WINDOW_MS;
}

function takeVisible<T>(users: T[]): { visible: T[]; hidden: number } {
  return {
    visible: users.slice(0, PRESENCE_LIST_LIMIT),
    hidden: Math.max(0, users.length - PRESENCE_LIST_LIMIT),
  };
}

export async function getOnlinePresenceSnapshot(now = new Date()): Promise<OnlinePresenceSnapshot> {
  const since = new Date(now.getTime() - LOGGED_IN_WINDOW_MS);
  const users = await prisma.user.findMany({
    where: {
      OR: [{ lastSeenAt: { gte: since } }, { lastLoginAttempt: { gte: since } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      isSupport: true,
      lastSeenAt: true,
      lastLoginAttempt: true,
      tenants: {
        select: {
          tenant: { select: { name: true } },
        },
      },
    },
  });

  const loggedIn = users
    .filter((user) =>
      isPresenceLoggedIn(
        { lastSeenAt: user.lastSeenAt, lastLoginAttempt: user.lastLoginAttempt },
        now,
      ),
    )
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isStaff: user.isSuperAdmin || user.isSupport,
      lastSeenAt: (user.lastSeenAt ?? user.lastLoginAttempt) as Date,
      companies: user.tenants.map((membership) => membership.tenant.name),
      active: isPresenceActive(user.lastSeenAt, now),
      activityAt: latestUserActivity(user.lastSeenAt, user.lastLoginAttempt)?.getTime() ?? 0,
    }));

  const active = loggedIn
    .filter((user) => user.active)
    .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  const idle = loggedIn
    .filter((user) => !user.active)
    .sort((a, b) => b.activityAt - a.activityAt);
  const visibleActive = takeVisible(active);
  const visibleIdle = takeVisible(idle);

  const toPublic = (user: (typeof loggedIn)[number]): OnlinePresenceUser => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isStaff: user.isStaff,
    lastSeenAt: user.lastSeenAt,
    companies: user.companies,
  });

  const countCustomers = (rows: Array<{ isStaff: boolean }>) =>
    rows.filter((user) => !user.isStaff).length;

  return {
    onlineCustomerCount: countCustomers(active),
    onlineStaffCount: active.length - countCustomers(active),
    loggedInCustomerCount: countCustomers(loggedIn),
    loggedInStaffCount: loggedIn.length - countCustomers(loggedIn),
    safeToUpgrade: countCustomers(active) === 0,
    windowMinutes: PRESENCE_WINDOW_MS / 60000,
    loggedInWindowHours: LOGGED_IN_WINDOW_MS / (60 * 60 * 1000),
    listLimit: PRESENCE_LIST_LIMIT,
    activeUsers: visibleActive.visible.map(toPublic),
    idleUsers: visibleIdle.visible.map(toPublic),
    hiddenActiveCount: visibleActive.hidden,
    hiddenIdleCount: visibleIdle.hidden,
  };
}
