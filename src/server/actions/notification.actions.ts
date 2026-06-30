"use server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAuthContext } from "@/lib/server-authorization";
import { NotificationType, Role } from "@prisma/client";
import { publishNotification } from "@/lib/redis-pubsub";
import { sendPushNotificationToUser } from "@/lib/push-notifications";
import {
  isNotificationTypeEnabledForUser,
  shouldSendImmediateEmailForType,
  shouldSendImmediateSmsForType,
} from "@/lib/notification-routing";
import { sendSms, formatPhoneNumber } from "@/lib/sms";

interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://hmsnova.no";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendImmediateNotificationEmail(input: {
  to: string;
  title: string;
  message: string;
  link?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  const safeTitle = escapeHtml(input.title);
  const safeMessage = escapeHtml(input.message);
  const fullLink = input.link ? `${APP_URL}${input.link}` : `${APP_URL}/dashboard/notifications`;

  await sendEmail({
    to: input.to,
    subject: `HMS Nova: ${safeTitle}`,
    html: `
      <h2>${safeTitle}</h2>
      <p>${safeMessage}</p>
      <p>
        <a href="${fullLink}" style="display:inline-block;padding:10px 18px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;">
          Åpne varsling
        </a>
      </p>
    `,
  });
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: input.userId,
          tenantId: input.tenantId,
        },
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!userTenant) {
      return { success: false, error: "Brukeren er ikke medlem i valgt tenant" };
    }

    if (!isNotificationTypeEnabledForUser(input.type, userTenant)) {
      return { success: true, skipped: true };
    }

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

    try {
      await sendPushNotificationToUser(input.tenantId, input.userId, {
        title: input.title,
        body: input.message,
        data: {
          notificationId: notification.id,
          link: input.link ?? null,
          type: input.type,
        },
      });
    } catch (pushError) {
      console.error("Push notification send error:", pushError);
    }

    if (userTenant.user.email && shouldSendImmediateEmailForType(input.type, userTenant)) {
      try {
        await sendImmediateNotificationEmail({
          to: userTenant.user.email,
          title: input.title,
          message: input.message,
          link: input.link,
        });
      } catch (emailError) {
        console.error("Immediate notification email failed:", emailError);
      }
    }

    // SMS for kritiske varseltyper — respekterer notifyBySms-preferansen
    if (shouldSendImmediateSmsForType(input.type, userTenant)) {
      const rawPhone = (userTenant as any).phone ?? userTenant.user.phone ?? null;
      const phone = formatPhoneNumber(rawPhone);
      if (phone) {
        try {
          const smsMessage = `${input.title}: ${input.message}`.slice(0, 155) + (
            input.link ? ` Se: ${APP_URL}${input.link}`.slice(0, 160 - (input.title.length + input.message.length + 5)) : ""
          );
          await sendSms({ to: phone, message: smsMessage.slice(0, 160) });
        } catch (smsError) {
          console.error("Immediate notification SMS failed:", smsError);
        }
      }
    }

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

export async function notifyUsersByRoles(
  tenantId: string,
  roles: Array<Role | string>,
  notification: Omit<CreateNotificationInput, "tenantId" | "userId">
) {
  try {
    const normalizedRoles = Array.from(new Set(roles)) as Role[];
    const users = await prisma.userTenant.findMany({
      where: {
        tenantId,
        role: { in: normalizedRoles },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
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
    console.error("Notify users by roles error:", error);
    return { success: false, error: error.message };
  }
}

