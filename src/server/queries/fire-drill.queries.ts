"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchFireDrills() {
  const auth = await getAuthContext();
  if (!auth) return { drills: [], users: [] };
  const { tenantId } = auth;

  const [drills, users] = await Promise.all([
    prisma.fireDrill.findMany({
      where: { tenantId },
      include: { measures: { select: { id: true, status: true } } },
      orderBy: { plannedDate: "desc" },
    }),
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const userMap = Object.fromEntries(
    users.map((ut) => [ut.userId, ut.user.name ?? ut.user.id]),
  );

  return JSON.parse(JSON.stringify({ drills, userMap }));
}
