import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const expoPushTokenPattern = /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/;

async function resolveTenantId(userId: string, sessionTenantId?: string | null) {
  if (sessionTenantId) {
    const membership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: sessionTenantId,
        },
      },
      select: { tenantId: true },
    });

    if (membership) {
      return membership.tenantId;
    }
  }

  const fallbackMembership = await prisma.userTenant.findFirst({
    where: { userId },
    select: { tenantId: true },
  });

  return fallbackMembership?.tenantId ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          token?: string;
          platform?: string;
        }
      | null;
    const token = body?.token?.trim();
    const platform = body?.platform?.trim() || "unknown";

    if (!token || !expoPushTokenPattern.test(token)) {
      return NextResponse.json({ error: "Invalid Expo push token" }, { status: 400 });
    }

    const tenantId = await resolveTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 404 });
    }

    await prisma.notificationPushToken.upsert({
      where: {
        tenantId_userId_expoPushToken: {
          tenantId,
          userId: session.user.id,
          expoPushToken: token,
        },
      },
      update: {
        platform,
        lastSeenAt: new Date(),
      },
      create: {
        tenantId,
        userId: session.user.id,
        expoPushToken: token,
        platform,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST push-token error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          token?: string;
        }
      | null;
    const token = body?.token?.trim();

    const tenantId = await resolveTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 404 });
    }

    if (token) {
      await prisma.notificationPushToken.deleteMany({
        where: {
          tenantId,
          userId: session.user.id,
          expoPushToken: token,
        },
      });
    } else {
      await prisma.notificationPushToken.deleteMany({
        where: {
          tenantId,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE push-token error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
