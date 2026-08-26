"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireGroupPermission } from "@/lib/corporate-group-context";

const groupInfoSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn").max(100),
  orgNumber: z.string().max(20).optional().nullable(),
  contactEmail: z.string().email("Ugyldig e-postadresse").optional().nullable(),
  contactPhone: z.string().max(20).optional().nullable(),
});

const notificationSettingsSchema = z.object({
  scoreThreshold: z.number().min(0).max(100).default(60),
  incidentAlertDays: z.number().min(1).max(365).default(30),
  emailRecipients: z.array(z.string().email()).default([]),
});

export async function getGroupSettings() {
  const context = await requireGroupPermission("canManageGroup");

  const group = await prisma.corporateGroup.findUnique({
    where: { id: context.groupId },
    select: {
      id: true,
      name: true,
      orgNumber: true,
      contactEmail: true,
      contactPhone: true,
      logo: true,
      settings: true,
    },
  });

  if (!group) {
    throw new Error("Konsernet ble ikke funnet");
  }

  const rawSettings = (group.settings as Record<string, unknown>) ?? {};
  const notifications = (rawSettings.notifications as Record<string, unknown>) ?? {};

  return {
    ...group,
    notifications: {
      scoreThreshold: (notifications.scoreThreshold as number) ?? 60,
      incidentAlertDays: (notifications.incidentAlertDays as number) ?? 30,
      emailRecipients: (notifications.emailRecipients as string[]) ?? [],
    },
  };
}

export async function updateGroupInfo(data: {
  name: string;
  orgNumber?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}) {
  const context = await requireGroupPermission("canManageGroup");
  const validated = groupInfoSchema.parse(data);

  await prisma.corporateGroup.update({
    where: { id: context.groupId },
    data: validated,
  });

  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId: context.groupId,
      userId: context.userId,
      action: "UPDATE_GROUP_INFO",
      targetType: "group",
      targetId: context.groupId,
    },
  });

  revalidatePath("/konsern");
  return { success: true };
}

export async function updateGroupLogo(logoKey: string | null) {
  const context = await requireGroupPermission("canManageGroup");

  await prisma.corporateGroup.update({
    where: { id: context.groupId },
    data: { logo: logoKey },
  });

  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId: context.groupId,
      userId: context.userId,
      action: logoKey ? "UPLOAD_LOGO" : "REMOVE_LOGO",
      targetType: "group",
      targetId: context.groupId,
    },
  });

  revalidatePath("/konsern");
  return { success: true };
}

export async function updateGroupNotificationSettings(data: {
  scoreThreshold: number;
  incidentAlertDays: number;
  emailRecipients: string[];
}) {
  const context = await requireGroupPermission("canManageGroup");
  const validated = notificationSettingsSchema.parse(data);

  const group = await prisma.corporateGroup.findUnique({
    where: { id: context.groupId },
    select: { settings: true },
  });

  const existingSettings = (group?.settings as Record<string, unknown>) ?? {};

  await prisma.corporateGroup.update({
    where: { id: context.groupId },
    data: {
      settings: JSON.parse(JSON.stringify({
        ...existingSettings,
        notifications: validated,
      })),
    },
  });

  await prisma.corporateGroupAuditLog.create({
    data: {
      groupId: context.groupId,
      userId: context.userId,
      action: "UPDATE_NOTIFICATION_SETTINGS",
      targetType: "group",
      targetId: context.groupId,
    },
  });

  revalidatePath("/konsern/innstillinger");
  return { success: true };
}
