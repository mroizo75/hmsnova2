import { prisma } from "@/lib/db";

export const PRESENCE_WINDOW_MS = 5 * 60 * 1000;
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

export type OnlinePresenceSnapshot = {
  onlineCustomerCount: number;
  onlineStaffCount: number;
  safeToUpgrade: boolean;
  windowMinutes: number;
  users: OnlinePresenceUser[];
};

export async function getOnlinePresenceSnapshot(): Promise<OnlinePresenceSnapshot> {
  const since = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const users = await prisma.user.findMany({
    where: { lastSeenAt: { gte: since } },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      isSupport: true,
      lastSeenAt: true,
      tenants: {
        select: {
          tenant: { select: { name: true } },
        },
      },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  const mapped: OnlinePresenceUser[] = users
    .filter((user) => user.lastSeenAt)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isStaff: user.isSuperAdmin || user.isSupport,
      lastSeenAt: user.lastSeenAt as Date,
      companies: user.tenants.map((membership) => membership.tenant.name),
    }));

  const onlineStaffCount = mapped.filter((user) => user.isStaff).length;
  const onlineCustomerCount = mapped.length - onlineStaffCount;

  return {
    onlineCustomerCount,
    onlineStaffCount,
    safeToUpgrade: onlineCustomerCount === 0,
    windowMinutes: PRESENCE_WINDOW_MS / 60000,
    users: mapped,
  };
}
