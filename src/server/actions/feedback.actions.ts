"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FeedbackSource, FeedbackSentiment, FeedbackStatus } from "@prisma/client";
import { getRequiredTenantContext } from "@/lib/tenant-context";

const createFeedbackSchema = z.object({
  customerName: z.string().max(140).optional(),
  customerCompany: z.string().max(140).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(60).optional().or(z.literal("")),
  source: z.nativeEnum(FeedbackSource),
  sentiment: z.nativeEnum(FeedbackSentiment).default("POSITIVE"),
  rating: z
    .union([z.string(), z.number()])
    .transform((value) => {
      if (value === "" || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    })
    .refine((val) => val === undefined || (val >= 1 && val <= 5), {
      message: "Vurdering må være mellom 1 og 5",
    })
    .optional(),
  summary: z.string().min(5, "Oppsummering må være minst 5 tegn"),
  details: z.string().optional().or(z.literal("")),
  highlights: z.string().optional().or(z.literal("")),
  followUpOwnerId: z.string().cuid().optional().or(z.literal("")),
  feedbackDate: z.string().datetime().optional(),
  linkedGoalId: z.string().cuid().optional().or(z.literal("")),
});

const updateFeedbackStatusSchema = z.object({
  id: z.string().cuid(),
  followUpStatus: z.nativeEnum(FeedbackStatus),
  followUpOwnerId: z.string().cuid().optional().or(z.literal("")),
  followUpNotes: z.string().optional().or(z.literal("")),
});

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("Ingen tenant funnet for bruker");
  }

  return { user, tenantId: tenantContext.tenantId };
}

export async function createCustomerFeedback(formData: FormData | Record<string, any>) {
  try {
    const { user, tenantId } = await getSessionContext();
    const input =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    const normalized = {
      ...input,
      rating: input.rating === "__no_rating__" ? undefined : input.rating,
      followUpOwnerId:
        input.followUpOwnerId && input.followUpOwnerId !== "__none__"
          ? input.followUpOwnerId
          : undefined,
      linkedGoalId:
        input.linkedGoalId && input.linkedGoalId !== "__none__" && input.linkedGoalId !== "__none_goal__"
          ? input.linkedGoalId
          : undefined,
    };

    const validated = createFeedbackSchema.parse(normalized);

    const feedback = await prisma.customerFeedback.create({
      data: {
        tenantId,
        recordedById: user.id,
        customerName: validated.customerName?.trim() || null,
        customerCompany: validated.customerCompany?.trim() || null,
        contactEmail: validated.contactEmail?.trim() || null,
        contactPhone: validated.contactPhone?.trim() || null,
        source: validated.source,
        sentiment: validated.sentiment,
        rating: validated.rating,
        summary: validated.summary.trim(),
        details: validated.details?.trim() || null,
        highlights: validated.highlights?.trim() || null,
        followUpOwnerId: validated.followUpOwnerId || null,
        feedbackDate: validated.feedbackDate
          ? new Date(validated.feedbackDate)
          : new Date(),
        linkedGoalId: validated.linkedGoalId || null,
      },
      include: {
        recordedBy: { select: { name: true, email: true } },
        followUpOwner: { select: { name: true, email: true } },
      },
    });

    revalidatePath("/dashboard/feedback");

    return { success: true, data: feedback };
  } catch (error: any) {
    console.error("[createCustomerFeedback]", error);
    return {
      success: false,
      error: error.message || "Kunne ikke registrere tilbakemelding",
    };
  }
}

export async function updateCustomerFeedbackStatus(input: any) {
  try {
    const { tenantId } = await getSessionContext();
    const validated = updateFeedbackStatusSchema.parse(input);

    const feedback = await prisma.customerFeedback.update({
      where: {
        id: validated.id,
        tenantId,
      },
      data: {
        followUpStatus: validated.followUpStatus,
        followUpOwnerId:
          validated.followUpOwnerId && validated.followUpOwnerId !== "__none__"
            ? validated.followUpOwnerId
            : null,
        followUpNotes: validated.followUpNotes?.trim() || null,
      },
    });

    revalidatePath("/dashboard/feedback");
    revalidatePath("/dashboard");

    return { success: true, data: feedback };
  } catch (error: any) {
    console.error("[updateCustomerFeedbackStatus]", error);
    return {
      success: false,
      error: error.message || "Kunne ikke oppdatere status",
    };
  }
}

