"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: "Kun superadmin" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      dashboardLocked: true,
      lockedDashboardConfig: true,
    },
  });

  const result = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    dashboardLocked: t.dashboardLocked,
    hasLockedConfig: t.lockedDashboardConfig !== null,
    lockedConfigWidgetCount: Array.isArray(t.lockedDashboardConfig)
      ? (t.lockedDashboardConfig as unknown[]).length
      : 0,
  }));

  return NextResponse.json({
    ok: true,
    columnsExist: true,
    tenants: result,
  });
}
