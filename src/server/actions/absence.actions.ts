"use server";

/**
 * Server actions for fraværsmodul
 *
 * Hjemmel:
 *   AML § 5-1 (4): statistikk over sykefravær
 *   AML § 8-24 / folketrygdloven § 8-23..§ 8-27: egenmelding
 *   Ferieloven § 5: ferieavvikling
 *   GDPR art. 9: helseopplysninger krever særskilt behandlingsgrunnlag
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { createNotification } from "@/server/actions/notification.actions";
import {
  CreateAbsenceSchema,
  UpdateAbsenceSchema,
  ApproveAbsenceSchema,
  RejectAbsenceSchema,
  type CreateAbsenceInput,
  type UpdateAbsenceInput,
  type ApproveAbsenceInput,
  type RejectAbsenceInput,
} from "@/features/absence/schemas/absence.schema";
import {
  CompleteFollowUpSchema,
  SkipFollowUpSchema,
  UpdateFollowUpPlanSchema,
  UpdateDialogMeetingSchema,
  type CompleteFollowUpInput,
  type SkipFollowUpInput,
  type UpdateFollowUpPlanInput,
  type UpdateDialogMeetingInput,
} from "@/features/absence/schemas/follow-up.schema";
import { addDays } from "date-fns";

// ─── Hjelpefunksjon: beregn virkedager ──────────────────────────────────────

function calculateWorkdays(startDate: string, endDate: string, percentage: number): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return Math.round(count * (percentage / 100) * 10) / 10;
}

// ─── Opprett fravær ─────────────────────────────────────────────────────────

export async function createAbsence(input: CreateAbsenceInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateAbsence) {
      throw new Error("Du har ikke tilgang til å registrere fravær");
    }

    const validated = CreateAbsenceSchema.parse(input);

    // Admin/leder kan registrere for andre, ellers for seg selv
    let targetUserId = auth.userId;
    if (validated.userId && validated.userId !== auth.userId) {
      if (!auth.permissions.canApproveAbsence) {
        throw new Error("Du har ikke tilgang til å registrere fravær for andre");
      }
      const targetUser = await prisma.userTenant.findFirst({
        where: { userId: validated.userId, tenantId: auth.tenantId },
      });
      if (!targetUser) throw new Error("Ansatt er ikke tilknyttet denne bedriften");
      targetUserId = validated.userId;
    }

    const workdays = calculateWorkdays(
      validated.startDate,
      validated.endDate,
      validated.percentage,
    );

    const absence = await prisma.absence.create({
      data: {
        tenantId: auth.tenantId,
        userId: targetUserId,
        type: validated.type,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        percentage: validated.percentage,
        workdays,
        reason: validated.reason ?? null,
        doctorName: validated.doctorName ?? null,
        diagnosisCode: validated.diagnosisCode ?? null,
        selfCertifiedDays: validated.selfCertifiedDays ?? null,
        attachmentUrl: validated.attachmentUrl ?? null,
        attachmentName: validated.attachmentName ?? null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Varsle nærmeste leder om nytt fravær
    const userTenant = await prisma.userTenant.findFirst({
      where: { userId: targetUserId, tenantId: auth.tenantId },
      select: { managerId: true },
    });

    if (userTenant?.managerId) {
      await createNotification({
        tenantId: auth.tenantId,
        userId: userTenant.managerId,
        type: "ABSENCE_REQUESTED",
        title: "Nytt fravær registrert",
        message: `${absence.user.name ?? "En ansatt"} har registrert fravær fra ${validated.startDate} til ${validated.endDate}`,
        link: "/dashboard/fravaer",
      });
    }

    revalidatePath("/dashboard/fravaer");
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(absence)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke registrere fravær" };
  }
}

// ─── Oppdater fravær ────────────────────────────────────────────────────────

export async function updateAbsence(input: UpdateAbsenceInput) {
  try {
    const auth = await getAuthContext();
    const validated = UpdateAbsenceSchema.parse(input);

    const absence = await prisma.absence.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!absence) throw new Error("Fravær ikke funnet");

    if (absence.status !== "PENDING") {
      throw new Error("Kun fravær med status 'Venter' kan endres");
    }

    const canEdit =
      absence.userId === auth.userId || auth.permissions.canApproveAbsence;
    if (!canEdit) throw new Error("Du har ikke tilgang til å redigere dette fraværet");

    const { id, ...updateFields } = validated;

    const updateData: any = { ...updateFields };
    if (updateFields.startDate) updateData.startDate = new Date(updateFields.startDate);
    if (updateFields.endDate) updateData.endDate = new Date(updateFields.endDate);

    // Oppdater virkedager hvis datoer eller prosent endres
    const effectiveStart = updateFields.startDate ?? absence.startDate.toISOString().slice(0, 10);
    const effectiveEnd = updateFields.endDate ?? absence.endDate.toISOString().slice(0, 10);
    const effectivePct = updateFields.percentage ?? absence.percentage;
    updateData.workdays = calculateWorkdays(effectiveStart, effectiveEnd, effectivePct);

    const updated = await prisma.absence.update({
      where: { id: validated.id },
      data: updateData,
    });

    revalidatePath("/dashboard/fravaer");
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke oppdatere fravær" };
  }
}

// ─── Godkjenn fravær ────────────────────────────────────────────────────────

export async function approveAbsence(input: ApproveAbsenceInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canApproveAbsence) {
      throw new Error("Du har ikke tilgang til å godkjenne fravær");
    }

    const validated = ApproveAbsenceSchema.parse(input);

    const absence = await prisma.absence.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!absence) throw new Error("Fravær ikke funnet");
    if (absence.status !== "PENDING") throw new Error("Kun ventende fravær kan godkjennes");

    const updated = await prisma.absence.update({
      where: { id: validated.id },
      data: {
        status: "APPROVED",
        approvedById: auth.userId,
        approvedAt: new Date(),
      },
    });

    // AML § 4-6: generer oppfølgingsmilepæler for sykefravær
    if (absence.type === "SICK_LEAVE") {
      await generateFollowUpMilestones(validated.id, auth.tenantId, absence.startDate);
    }

    await createNotification({
      tenantId: auth.tenantId,
      userId: absence.userId,
      type: "ABSENCE_APPROVED",
      title: "Fravær godkjent",
      message: "Ditt fravær er godkjent av leder",
      link: "/dashboard/fravaer",
    });

    revalidatePath("/dashboard/fravaer");
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke godkjenne fravær" };
  }
}

// ─── Avvis fravær ───────────────────────────────────────────────────────────

export async function rejectAbsence(input: RejectAbsenceInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canApproveAbsence) {
      throw new Error("Du har ikke tilgang til å avvise fravær");
    }

    const validated = RejectAbsenceSchema.parse(input);

    const absence = await prisma.absence.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!absence) throw new Error("Fravær ikke funnet");
    if (absence.status !== "PENDING") throw new Error("Kun ventende fravær kan avvises");

    const updated = await prisma.absence.update({
      where: { id: validated.id },
      data: {
        status: "REJECTED",
        rejectedById: auth.userId,
        rejectedAt: new Date(),
        rejectedReason: validated.rejectedReason ?? null,
      },
    });

    await createNotification({
      tenantId: auth.tenantId,
      userId: absence.userId,
      type: "ABSENCE_REJECTED",
      title: "Fravær avvist",
      message: validated.rejectedReason
        ? `Ditt fravær ble avvist: ${validated.rejectedReason}`
        : "Ditt fravær ble avvist av leder",
      link: "/dashboard/fravaer",
    });

    revalidatePath("/dashboard/fravaer");
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke avvise fravær" };
  }
}

// ─── Kanseller fravær ───────────────────────────────────────────────────────

export async function cancelAbsence(id: string) {
  try {
    const auth = await getAuthContext();

    const absence = await prisma.absence.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!absence) throw new Error("Fravær ikke funnet");

    if (absence.userId !== auth.userId && !auth.permissions.canApproveAbsence) {
      throw new Error("Du kan kun kansellere eget fravær");
    }

    if (absence.status !== "PENDING") {
      throw new Error("Kun ventende fravær kan kanselleres");
    }

    const updated = await prisma.absence.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard/fravaer");
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke kansellere fravær" };
  }
}

// ─── Sykefraværsoppfølging (AML § 4-6) ─────────────────────────────────────

const MILESTONE_OFFSETS: { milestone: any; days: number }[] = [
  { milestone: "FOLLOW_UP_PLAN", days: 28 },       // 4 uker
  { milestone: "DIALOG_MEETING_1", days: 49 },      // 7 uker
  { milestone: "ACTIVITY_REQUIREMENT", days: 56 },   // 8 uker
  { milestone: "DIALOG_MEETING_2", days: 182 },      // 26 uker
  { milestone: "MAX_DATE", days: 365 },               // 52 uker
];

async function generateFollowUpMilestones(
  absenceId: string,
  tenantId: string,
  startDate: Date,
) {
  const existing = await prisma.sickLeaveFollowUp.findMany({
    where: { absenceId },
    select: { milestone: true },
  });
  const existingMilestones = new Set(existing.map((e) => e.milestone));

  const toCreate = MILESTONE_OFFSETS.filter(
    (m) => !existingMilestones.has(m.milestone),
  );

  if (toCreate.length === 0) return;

  await prisma.sickLeaveFollowUp.createMany({
    data: toCreate.map((m) => ({
      tenantId,
      absenceId,
      milestone: m.milestone,
      dueDate: addDays(new Date(startDate), m.days),
    })),
  });
}

export async function completeFollowUp(input: CompleteFollowUpInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canApproveAbsence) {
      throw new Error("Du har ikke tilgang til å fullføre oppfølgingspunkt");
    }

    const validated = CompleteFollowUpSchema.parse(input);

    const followUp = await prisma.sickLeaveFollowUp.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!followUp) throw new Error("Oppfølgingspunkt ikke funnet");
    if (followUp.status === "COMPLETED") throw new Error("Allerede fullført");

    const updated = await prisma.sickLeaveFollowUp.update({
      where: { id: validated.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: auth.userId,
        notes: validated.notes ?? followUp.notes,
        attachmentUrl: validated.attachmentUrl ?? followUp.attachmentUrl,
        attachmentName: validated.attachmentName ?? followUp.attachmentName,
      },
    });

    revalidatePath(`/dashboard/fravaer/${followUp.absenceId}`);
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke fullføre oppfølgingspunkt" };
  }
}

export async function skipFollowUp(input: SkipFollowUpInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canApproveAbsence) {
      throw new Error("Du har ikke tilgang til å hoppe over oppfølgingspunkt");
    }

    const validated = SkipFollowUpSchema.parse(input);

    const followUp = await prisma.sickLeaveFollowUp.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!followUp) throw new Error("Oppfølgingspunkt ikke funnet");
    if (followUp.status === "COMPLETED" || followUp.status === "SKIPPED") {
      throw new Error("Kan ikke hoppe over et allerede behandlet punkt");
    }

    const updated = await prisma.sickLeaveFollowUp.update({
      where: { id: validated.id },
      data: {
        status: "SKIPPED",
        skippedReason: validated.skippedReason,
        completedAt: new Date(),
        completedById: auth.userId,
      },
    });

    revalidatePath(`/dashboard/fravaer/${followUp.absenceId}`);
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke hoppe over oppfølgingspunkt" };
  }
}

export async function updateFollowUpPlan(input: UpdateFollowUpPlanInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canApproveAbsence) {
      throw new Error("Du har ikke tilgang til å oppdatere oppfølgingsplan");
    }

    const validated = UpdateFollowUpPlanSchema.parse(input);

    const followUp = await prisma.sickLeaveFollowUp.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId, milestone: "FOLLOW_UP_PLAN" },
    });
    if (!followUp) throw new Error("Oppfølgingsplan ikke funnet");

    const updated = await prisma.sickLeaveFollowUp.update({
      where: { id: validated.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: auth.userId,
        workAssessment: validated.workAssessment,
        accommodations: validated.accommodations,
        externalSupport: validated.externalSupport ?? null,
        planSentToDoctor: validated.planSentToDoctor ?? false,
        planSentAt: validated.planSentAt ? new Date(validated.planSentAt) : null,
        notes: validated.notes ?? null,
        attachmentUrl: validated.attachmentUrl ?? null,
        attachmentName: validated.attachmentName ?? null,
      },
    });

    revalidatePath(`/dashboard/fravaer/${followUp.absenceId}`);
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke oppdatere oppfølgingsplan" };
  }
}

export async function updateDialogMeeting(input: UpdateDialogMeetingInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canApproveAbsence) {
      throw new Error("Du har ikke tilgang til å oppdatere dialogmøte");
    }

    const validated = UpdateDialogMeetingSchema.parse(input);

    const followUp = await prisma.sickLeaveFollowUp.findFirst({
      where: {
        id: validated.id,
        tenantId: auth.tenantId,
        milestone: { in: ["DIALOG_MEETING_1", "DIALOG_MEETING_2", "DIALOG_MEETING_3"] },
      },
    });
    if (!followUp) throw new Error("Dialogmøte ikke funnet");

    const updated = await prisma.sickLeaveFollowUp.update({
      where: { id: validated.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: auth.userId,
        meetingDate: new Date(validated.meetingDate),
        meetingNotes: validated.meetingNotes ?? null,
        attendees: validated.attendees ? JSON.stringify(validated.attendees) : null,
        doctorAttended: validated.doctorAttended ?? false,
        navAttended: validated.navAttended ?? false,
        notes: validated.notes ?? null,
        attachmentUrl: validated.attachmentUrl ?? null,
        attachmentName: validated.attachmentName ?? null,
      },
    });

    revalidatePath(`/dashboard/fravaer/${followUp.absenceId}`);
    triggerRealtimeEvent(auth.tenantId, "absence-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke oppdatere dialogmøte" };
  }
}
