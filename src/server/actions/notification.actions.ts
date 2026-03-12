"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { NotificationType, Role } from "@prisma/client";
import { publishNotification } from "@/lib/redis-pubsub";

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const notification = await prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      },
    });

    // Publiser til Redis pub/sub for real-time oppdatering
    await publishNotification(input.userId, notification, input.tenantId);

    return { success: true, data: notification };
  } catch (error: any) {
    console.error("Create notification error:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserNotifications(limit = 20) {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Unauthorized" };
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: context.userId,
        tenantId: context.tenantId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, data: notifications };
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return { success: false, error: error.message };
  }
}

export async function getUnreadCount() {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Unauthorized" };
    }

    const count = await prisma.notification.count({
      where: {
        userId: context.userId,
        tenantId: context.tenantId,
        isRead: false,
      },
    });

    return { success: true, data: count };
  } catch (error: any) {
    console.error("Get unread count error:", error);
    return { success: false, error: error.message };
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Unauthorized" };
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: context.userId,
        tenantId: context.tenantId,
      },
    });

    if (!notification) {
      return { success: false, error: "Varsling ikke funnet" };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Mark as read error:", error);
    return { success: false, error: error.message };
  }
}

export async function markAllAsRead() {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.notification.updateMany({
      where: {
        userId: context.userId,
        tenantId: context.tenantId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Mark all as read error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Unauthorized" };
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: context.userId,
        tenantId: context.tenantId,
      },
    });

    if (!notification) {
      return { success: false, error: "Varsling ikke funnet" };
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Delete notification error:", error);
    return { success: false, error: error.message };
  }
}

// Helper-funksjon for å sende varsling til spesifikke roller
export async function notifyUsersByRole(
  tenantId: string,
  role: Role | string,
  notification: Omit<CreateNotificationInput, "tenantId" | "userId">
) {
  try {
    const users = await prisma.userTenant.findMany({
      where: {
        tenantId,
        role: role as Role,
      },
      select: {
        userId: true,
      },
    });

    const promises = users.map((ut) =>
      createNotification({
        tenantId,
        userId: ut.userId,
        ...notification,
      })
    );

    await Promise.all(promises);
    return { success: true };
  } catch (error: any) {
    console.error("Notify users by role error:", error);
    return { success: false, error: error.message };
  }
}

