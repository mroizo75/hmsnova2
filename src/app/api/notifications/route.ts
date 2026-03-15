import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 20;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const tenantId = await resolveTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant found" },
        { status: 404 }
      );
    }

    const where = {
      userId: session.user.id,
      tenantId,
      ...(unreadOnly && { isRead: false }),
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        tenantId,
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("GET notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    const tenantId = await resolveTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant found" },
        { status: 404 }
      );
    }

    if (markAll) {
      // Merk alle som lest
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          tenantId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      // Merk enkelt varsling som lest
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: session.user.id,
          tenantId,
        },
      });

      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("PATCH notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        { error: "Missing notification ID" },
        { status: 400 }
      );
    }

    const tenantId = await resolveTenantId(session.user.id, session.user.tenantId);
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant found" },
        { status: 404 }
      );
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
        tenantId,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE notification error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

