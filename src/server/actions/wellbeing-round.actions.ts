"use server";

/**
 * Bedriften setter i gang psykososial kartlegging og sender den til ansatte.
 * AML § 4-3. Svaret lagres uten bruker. Bare deltakelse merkes.
 */

import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { canStartWellbeingRound } from "@/lib/wellbeing/round";
import { createNotification } from "@/server/actions/notification.actions";

const StartSchema = z.object({
  formTemplateId: z.string().min(1, "Velg et skjema"),
  title: z.string().trim().min(2, "Skriv en tittel").max(160),
  message: z.string().trim().max(1000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  userIds: z.array(z.string()).max(2000).optional(),
});

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join(". ");
  if (error instanceof Error) return error.message;
  return fallback;
}

async function notifyQuietly(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch {
    // Varsel skal ikke stoppe utsendingen.
  }
}

export async function startWellbeingRound(input: {
  formTemplateId: string;
  title: string;
  message?: string;
  dueDate?: string;
  userIds?: string[];
}) {
  try {
    const auth = await getAuthContext();
    if (!auth || !canStartWellbeingRound(auth.role)) {
      throw new Error("Bare administrator, HR eller HMS kan sende kartlegging");
    }
    const data = StartSchema.parse(input);
    const form = await prisma.formTemplate.findFirst({
      where: {
        id: data.formTemplateId,
        category: "WELLBEING",
        isActive: true,
        OR: [{ tenantId: auth.tenantId }, { isGlobal: true, tenantId: null }],
      },
      select: { id: true, title: true },
    });
    if (!form) throw new Error("Skjemaet er ikke tilgjengelig for bedriften");

    const requested = [...new Set((data.userIds ?? []).filter(Boolean))];
    const members = await prisma.userTenant.findMany({
      where: {
        tenantId: auth.tenantId,
        ...(requested.length > 0 ? { userId: { in: requested } } : {}),
      },
      select: { userId: true },
    });
    const userIds = [...new Set(members.map((member) => member.userId))];
    if (userIds.length === 0) throw new Error("Velg minst én ansatt");

    const round = await prisma.wellbeingRound.create({
      data: {
        tenantId: auth.tenantId,
        formTemplateId: form.id,
        title: data.title,
        message: data.message || null,
        dueDate: data.dueDate ? new Date(`${data.dueDate}T12:00:00.000Z`) : null,
        createdById: auth.userId,
        recipients: {
          create: userIds.map((userId) => ({ userId })),
        },
      },
    });

    const link = `/dashboard/wellbeing/${form.id}/fill?runde=${round.id}`;
    await Promise.all(
      userIds.map((userId) =>
        notifyQuietly({
          tenantId: auth.tenantId,
          userId,
          type: "WELLBEING_ASSIGNED",
          title: "Kartlegging av arbeidsmiljø",
          message: `${data.title}. Svaret er anonymt.`,
          link,
        }),
      ),
    );

    revalidatePath("/dashboard/wellbeing");
    return { success: true as const, recipientCount: userIds.length };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke sende kartleggingen") };
  }
}

export async function closeWellbeingRound(input: { id: string }) {
  try {
    const auth = await getAuthContext();
    if (!auth || !canStartWellbeingRound(auth.role)) {
      throw new Error("Bare administrator, HR eller HMS kan avslutte kartlegging");
    }
    const round = await prisma.wellbeingRound.findFirst({
      where: { id: input.id, tenantId: auth.tenantId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!round) throw new Error("Kartleggingen finnes ikke");
    await prisma.wellbeingRound.update({
      where: { id: round.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    revalidatePath("/dashboard/wellbeing");
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke avslutte kartleggingen") };
  }
}
