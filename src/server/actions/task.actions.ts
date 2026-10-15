"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { addDays, subDays, startOfDay, endOfDay } from "date-fns";

export interface TaskSummary {
  // Kritiske
  overdueIncidents: number;
  overdueMeasures: number;
  expiredTraining: number;
  overdueInspections: number;

  // Kommende (neste 7 dager)
  upcomingMeasures: {
    id: string;
    title: string;
    dueAt: Date;
  }[];
  upcomingMeetings: {
    id: string;
    title: string;
    type: string;
    scheduledDate: Date;
  }[];
  upcomingInspections: {
    id: string;
    title: string;
    scheduledDate: Date;
  }[];
  assignedInspections: {
    id: string;
    title: string;
    scheduledDate: Date;
  }[];
  laterMeasures: {
    id: string;
    title: string;
    dueAt: Date;
  }[];
  upcomingAudits: {
    id: string;
    title: string;
    scheduledDate: Date;
  }[];

  // Gjennomgang
  documentsNeedingReview: number;
  chemicalsNeedingReview: number;
  risksNeedingReview: number;
  goalsAtRisk: number;
  expiringTraining: {
    id: string;
    title: string;
    validUntil: Date;
  }[];

  // Statistikk
  openIncidents: number;
  activeMeasures: number;
  unreadNotifications: number;
}

export async function getMyTasks(): Promise<{ success: boolean; data?: TaskSummary; error?: string }> {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Unauthorized" };
    }

    const { userId, tenantId } = context;
    const now = new Date();
    const in7Days = addDays(now, 7);
    const in14Days = addDays(now, 14);
    const in30Days = addDays(now, 30);

    const [
      // Kritiske oppgaver
      overdueIncidents,
      overdueMeasures,
      expiredTraining,
      overdueInspections,

      // Kommende oppgaver
      upcomingMeasuresData,
      upcomingMeetingsData,
      upcomingInspectionsData,
      upcomingAuditsData,

      // Gjennomgang
      documentsNeedingReview,
      chemicalsNeedingReview,
      risksNeedingReview,
      goalsAtRisk,
      expiringTrainingData,

      // Statistikk
      openIncidents,
      activeMeasures,
      unreadNotifications,
    ] = await Promise.all([
      // Forfalte avvik (ansvarlig for)
      prisma.incident.count({
        where: {
          tenantId,
          responsibleId: userId,
          status: { in: ["OPEN", "INVESTIGATING"] },
          createdAt: { lt: subDays(now, 7) },
        },
      }),

      // Forfalte tiltak
      prisma.measure.count({
        where: {
          tenantId,
          responsibleId: userId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: startOfDay(now) },
        },
      }),

      // Utløpt opplæring
      prisma.training.count({
        where: {
          tenantId,
          userId,
          validUntil: { lt: startOfDay(now) },
          isRequired: true,
        },
      }),

      // Forfalte vernerunder
      prisma.inspection.count({
        where: {
          tenantId,
          OR: [
            { conductedBy: userId },
            { followUpById: userId },
          ],
          status: "PLANNED",
          scheduledDate: { lt: startOfDay(now) },
        },
      }),

      // Kommende tiltak (neste 7 dager)
      prisma.measure.findMany({
        where: {
          tenantId,
          responsibleId: userId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: {
            gte: startOfDay(now),
            lte: endOfDay(in7Days),
          },
        },
        select: { id: true, title: true, dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 10,
      }),

      // Kommende møter (neste 7 dager)
      prisma.meeting.findMany({
        where: {
          tenantId,
          participants: { some: { userId } },
          status: "PLANNED",
          scheduledDate: {
            gte: startOfDay(now),
            lte: endOfDay(in7Days),
          },
        },
        select: { id: true, title: true, type: true, scheduledDate: true },
        orderBy: { scheduledDate: "asc" },
        take: 10,
      }),

      // Kommende inspeksjoner (neste 7 dager)
      prisma.inspection.findMany({
        where: {
          tenantId,
          OR: [
            { conductedBy: userId },
            { followUpById: userId },
          ],
          status: "PLANNED",
          scheduledDate: {
            gte: startOfDay(now),
            lte: endOfDay(in7Days),
          },
        },
        select: { id: true, title: true, scheduledDate: true },
        orderBy: { scheduledDate: "asc" },
        take: 10,
      }),

      // Kommende revisjoner (neste 14 dager)
      prisma.audit.findMany({
        where: {
          tenantId,
          OR: [
            { leadAuditorId: userId },
            { teamMemberIds: { contains: userId } },
          ],
          status: "PLANNED",
          scheduledDate: {
            gte: startOfDay(now),
            lte: endOfDay(in14Days),
          },
        },
        select: { id: true, title: true, scheduledDate: true },
        orderBy: { scheduledDate: "asc" },
        take: 10,
      }),

      // Dokumenter som trenger revisjon (30 dager)
      prisma.document.count({
        where: {
          tenantId,
          status: "APPROVED",
          nextReviewDate: { lte: endOfDay(in30Days) },
        },
      }),

      // Kjemikalier som trenger revisjon
      prisma.chemical.count({
        where: {
          tenantId,
          status: "ACTIVE",
          nextReviewDate: { lte: endOfDay(in30Days) },
        },
      }),

      // Risikoer som trenger gjennomgang
      prisma.risk.count({
        where: {
          tenantId,
          status: { in: ["OPEN", "MITIGATING"] },
          nextReviewDate: { lte: endOfDay(in30Days) },
        },
      }),

      // Mål som er i fare
      prisma.goal.count({
        where: {
          tenantId,
          status: "AT_RISK",
          year: new Date().getFullYear(),
        },
      }),

      // Utløpende opplæring (30 dager)
      prisma.training.findMany({
        where: {
          tenantId,
          userId,
          validUntil: {
            gte: startOfDay(now),
            lte: endOfDay(in30Days),
          },
        },
        select: { id: true, title: true, validUntil: true },
        orderBy: { validUntil: "asc" },
        take: 10,
      }),

      // Alle åpne avvik
      prisma.incident.count({
        where: {
          tenantId,
          responsibleId: userId,
          status: { in: ["OPEN", "INVESTIGATING"] },
        },
      }),

      // Aktive tiltak
      prisma.measure.count({
        where: {
          tenantId,
          responsibleId: userId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),

      // Uleste varsler
      prisma.notification.count({
        where: {
          tenantId,
          userId,
          isRead: false,
        },
      }),
    ]);

    const [assignedInspectionsData, laterMeasuresData] = await Promise.all([
      prisma.inspection.findMany({
        where: {
          tenantId,
          OR: [{ conductedBy: userId }, { followUpById: userId }],
          status: { in: ["PLANNED", "IN_PROGRESS"] },
        },
        select: { id: true, title: true, scheduledDate: true },
        orderBy: { scheduledDate: "asc" },
        take: 30,
      }),
      prisma.measure.findMany({
        where: {
          tenantId,
          responsibleId: userId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { gt: endOfDay(in7Days) },
        },
        select: { id: true, title: true, dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 30,
      }),
    ]);

    const taskSummary: TaskSummary = {
      overdueIncidents,
      overdueMeasures,
      expiredTraining,
      overdueInspections,

      upcomingMeasures: upcomingMeasuresData.map((m) => ({
        id: m.id,
        title: m.title,
        dueAt: m.dueAt!,
      })),
      upcomingMeetings: upcomingMeetingsData.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        scheduledDate: m.scheduledDate,
      })),
      upcomingInspections: upcomingInspectionsData.map((i) => ({
        id: i.id,
        title: i.title,
        scheduledDate: i.scheduledDate!,
      })),
      assignedInspections: assignedInspectionsData.map((inspection) => ({
        id: inspection.id,
        title: inspection.title,
        scheduledDate: inspection.scheduledDate,
      })),
      laterMeasures: laterMeasuresData.map((measure) => ({
        id: measure.id,
        title: measure.title,
        dueAt: measure.dueAt!,
      })),
      upcomingAudits: upcomingAuditsData.map((a) => ({
        id: a.id,
        title: a.title,
        scheduledDate: a.scheduledDate!,
      })),

      documentsNeedingReview,
      chemicalsNeedingReview,
      risksNeedingReview,
      goalsAtRisk,
      expiringTraining: expiringTrainingData.map((t) => ({
        id: t.id,
        title: t.title,
        validUntil: t.validUntil!,
      })),

      openIncidents,
      activeMeasures,
      unreadNotifications,
    };

    return { success: true, data: taskSummary };
  } catch (error: any) {
    console.error("Get my tasks error:", error);
    return { success: false, error: error.message || "Kunne ikke hente oppgaver" };
  }
}

// Hent oppgaveoversikt for hele tenant (admin-visning)
export async function getTenantTaskSummary(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const context = await getAuthContext();
    if (!context) {
      return { success: false, error: "Unauthorized" };
    }

    const { tenantId, role } = context;
    
    // Kun admin/HMS kan se tenant-oversikt
    if (!["ADMIN", "HMS", "LEDER"].includes(role)) {
      return { success: false, error: "Ingen tilgang" };
    }

    const now = new Date();
    const in7Days = addDays(now, 7);
    const in30Days = addDays(now, 30);

    const [
      totalOpenIncidents,
      totalOverdueIncidents,
      totalOverdueMeasures,
      totalUpcomingMeasures,
      totalExpiredTraining,
      totalExpiringTraining,
      totalUpcomingInspections,
      totalOverdueInspections,
      totalDocumentsReview,
      totalChemicalsReview,
      totalRisksReview,
      totalGoalsAtRisk,
      totalUnreadNotifications,
    ] = await Promise.all([
      prisma.incident.count({
        where: { tenantId, status: { in: ["OPEN", "INVESTIGATING"] } },
      }),
      prisma.incident.count({
        where: {
          tenantId,
          status: { in: ["OPEN", "INVESTIGATING"] },
          createdAt: { lt: subDays(now, 7) },
        },
      }),
      prisma.measure.count({
        where: {
          tenantId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: startOfDay(now) },
        },
      }),
      prisma.measure.count({
        where: {
          tenantId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { gte: startOfDay(now), lte: endOfDay(in7Days) },
        },
      }),
      prisma.training.count({
        where: {
          tenantId,
          validUntil: { lt: startOfDay(now) },
          isRequired: true,
        },
      }),
      prisma.training.count({
        where: {
          tenantId,
          validUntil: { gte: startOfDay(now), lte: endOfDay(in30Days) },
        },
      }),
      prisma.inspection.count({
        where: {
          tenantId,
          status: "PLANNED",
          scheduledDate: { gte: startOfDay(now), lte: endOfDay(in7Days) },
        },
      }),
      prisma.inspection.count({
        where: {
          tenantId,
          status: "PLANNED",
          scheduledDate: { lt: startOfDay(now) },
        },
      }),
      prisma.document.count({
        where: {
          tenantId,
          status: "APPROVED",
          nextReviewDate: { lte: endOfDay(in30Days) },
        },
      }),
      prisma.chemical.count({
        where: {
          tenantId,
          status: "ACTIVE",
          nextReviewDate: { lte: endOfDay(in30Days) },
        },
      }),
      prisma.risk.count({
        where: {
          tenantId,
          status: { in: ["OPEN", "MITIGATING"] },
          nextReviewDate: { lte: endOfDay(in30Days) },
        },
      }),
      prisma.goal.count({
        where: {
          tenantId,
          status: "AT_RISK",
          year: new Date().getFullYear(),
        },
      }),
      prisma.notification.count({
        where: { tenantId, isRead: false },
      }),
    ]);

    return {
      success: true,
      data: {
        incidents: {
          open: totalOpenIncidents,
          overdue: totalOverdueIncidents,
        },
        measures: {
          overdue: totalOverdueMeasures,
          upcoming: totalUpcomingMeasures,
        },
        training: {
          expired: totalExpiredTraining,
          expiring: totalExpiringTraining,
        },
        inspections: {
          upcoming: totalUpcomingInspections,
          overdue: totalOverdueInspections,
        },
        reviews: {
          documents: totalDocumentsReview,
          chemicals: totalChemicalsReview,
          risks: totalRisksReview,
        },
        goals: {
          atRisk: totalGoalsAtRisk,
        },
        notifications: {
          unread: totalUnreadNotifications,
        },
        criticalCount: totalOverdueIncidents + totalOverdueMeasures + totalExpiredTraining + totalOverdueInspections,
      },
    };
  } catch (error: any) {
    console.error("Get tenant task summary error:", error);
    return { success: false, error: error.message || "Kunne ikke hente oppgaveoversikt" };
  }
}

