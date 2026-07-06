import { prisma } from "@/lib/db";
import { createNotification, notifyUsersByRole } from "@/server/actions/notification.actions";
import { addDays, addMonths, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { NotificationType, Role } from "@prisma/client";

/**
 * HMS Nova Scheduled Alerts System
 * 
 * Denne tjenesten kjører automatisk og sjekker alle elementer som trenger oppfølging:
 * - Avvik som ikke er behandlet
 * - Tiltak som forfaller
 * - Opplæring som utløper
 * - Vernerunder som er planlagt/forfalt
 * - Dokumenter som trenger revisjon
 * - Risikoer som trenger gjennomgang
 * - Kjemikalier/SDS som trenger oppdatering
 * - Mål som er i fare
 * - Ledelsens gjennomgang
 * - AMU/VO-møter
 * - Revisjoner og revisjonsfunn
 */

interface AlertResult {
  type: string;
  count: number;
  notifications: number;
}

interface TenantAlertSummary {
  tenantId: string;
  tenantName: string;
  alerts: AlertResult[];
  totalNotifications: number;
}

// ============================================
// HOVEDFUNKSJON - Kjør alle varselssjekker
// ============================================

export async function runScheduledAlerts(): Promise<TenantAlertSummary[]> {
  console.log("🔔 Starting scheduled alerts check...");
  
  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const results: TenantAlertSummary[] = [];

  for (const tenant of tenants) {
    const tenantAlerts: AlertResult[] = [];
    let totalNotifications = 0;

    // Kjør alle sjekker for denne tenant
    const checks = [
      checkOverdueIncidents(tenant.id),
      checkOverdueMeasures(tenant.id),
      checkUpcomingMeasures(tenant.id),
      checkExpiringTraining(tenant.id),
      checkExpiredTraining(tenant.id),
      checkUpcomingInspections(tenant.id),
      checkOverdueInspections(tenant.id),
      checkDocumentReviews(tenant.id),
      checkChemicalReviews(tenant.id),
      checkRiskReviews(tenant.id),
      checkGoalsAtRisk(tenant.id),
      checkUpcomingMeetings(tenant.id),
      checkUpcomingAudits(tenant.id),
      checkOpenAuditFindings(tenant.id),
      checkManagementReviewDue(tenant.id),
      checkInspectionFindings(tenant.id),
      checkConstructionDailyRosterControl(tenant.id),
      checkRoutineReviews(tenant.id),
      checkEmployeeReviewsDue(tenant.id),
    ];

    const checkResults = await Promise.all(checks);
    
    for (const result of checkResults) {
      if (result.count > 0) {
        tenantAlerts.push(result);
        totalNotifications += result.notifications;
      }
    }

    results.push({
      tenantId: tenant.id,
      tenantName: tenant.name,
      alerts: tenantAlerts,
      totalNotifications,
    });
  }

  console.log(`✅ Scheduled alerts completed. Processed ${tenants.length} tenants.`);
  return results;
}

async function checkRoutineReviews(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  const dueRoutines = await prisma.routine.findMany({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "NEEDS_REVIEW"] },
      nextReviewAt: {
        lte: endOfDay(addDays(now, 7)),
      },
    },
    select: {
      id: true,
      title: true,
      nextReviewAt: true,
      responsibleId: true,
    },
  });

  for (const routine of dueRoutines) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "ROUTINE_REVIEW_DUE",
        link: { contains: routine.id },
        createdAt: { gt: subDays(now, 5) },
      },
      select: { id: true },
    });

    if (recentNotification) {
      continue;
    }

    const reviewDateText = routine.nextReviewAt
      ? new Date(routine.nextReviewAt).toLocaleDateString("nb-NO")
      : "snarest";

    if (routine.responsibleId) {
      await createNotification({
        tenantId,
        userId: routine.responsibleId,
        type: "ROUTINE_REVIEW_DUE",
        title: "Rutine krever revisjon",
        message: `Rutinen "${routine.title}" skal revideres innen ${reviewDateText}.`,
        link: `/dashboard/rutiner/${routine.id}`,
      });
    }

    await notifyUsersByRole(tenantId, "LEDER", {
      type: "ROUTINE_REVIEW_DUE",
      title: "Lederoppfolging: rutine til revisjon",
      message: `Rutinen "${routine.title}" trenger oppfolging innen ${reviewDateText}.`,
      link: `/dashboard/rutiner/${routine.id}`,
    });
    await notifyUsersByRole(tenantId, "HMS", {
      type: "ROUTINE_REVIEW_DUE",
      title: "HMS-oppfolging: rutine til revisjon",
      message: `Rutinen "${routine.title}" trenger oppfolging innen ${reviewDateText}.`,
      link: `/dashboard/rutiner/${routine.id}`,
    });
    notifications += 1;
  }

  return { type: "ROUTINE_REVIEW_DUE", count: dueRoutines.length, notifications };
}

// ============================================
// BYGG/ANLEGG - Daglig kontroll av oversiktsliste
// ============================================

async function checkConstructionDailyRosterControl(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  let notifications = 0;
  const tenantSettings = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      constructionDailyCheckAlertsEnabled: true,
      constructionDailyCheckAlertRole: true,
    },
  });
  if (!tenantSettings?.constructionDailyCheckAlertsEnabled) {
    return {
      type: "CONSTRUCTION_DAILY_CHECK_MISSING",
      count: 0,
      notifications: 0,
    };
  }

  // Finn prosjekter med aktive personer på byggeplassen
  const projectsWithActiveRoster = await prisma.project.findMany({
    where: {
      tenantId,
      constructionRosterEntries: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  let missingCount = 0;
  const selectedRole = tenantSettings.constructionDailyCheckAlertRole;
  const selectedRoleCount = await prisma.userTenant.count({
    where: {
      tenantId,
      role: selectedRole,
    },
  });
  const notifyRole: Role = selectedRoleCount > 0 ? selectedRole : Role.ADMIN;

  for (const project of projectsWithActiveRoster) {
    const hasDailyCheckToday = await prisma.constructionRosterDailyCheck.findFirst({
      where: {
        tenantId,
        projectId: project.id,
        checkedDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { id: true },
    });

    if (hasDailyCheckToday) {
      continue;
    }

    missingCount += 1;

    // Unngå spam: maks ett varsel per prosjekt per dag
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "SYSTEM_ALERT",
        link: `/dashboard/projects/${project.id}/construction-compliance`,
        title: "⚠️ Daglig kontroll mangler (bygg/anlegg)",
        createdAt: {
          gt: todayStart,
        },
      },
      select: { id: true },
    });

    if (recentNotification) {
      continue;
    }

    await notifyUsersByRole(tenantId, notifyRole, {
      type: "SYSTEM_ALERT",
      title: "⚠️ Daglig kontroll mangler (bygg/anlegg)",
      message: `Prosjekt "${project.name}" har aktive personer i oversiktslisten, men ingen daglig kontroll er registrert i dag.`,
      link: `/dashboard/projects/${project.id}/construction-compliance`,
    });
    notifications += 1;
  }

  return {
    type: "CONSTRUCTION_DAILY_CHECK_MISSING",
    count: missingCount,
    notifications,
  };
}

// ============================================
// AVVIK - Sjekk ubehandlede/forfalt
// ============================================

async function checkOverdueIncidents(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  // Finn avvik som har vært åpne i mer enn 7 dager uten behandling
  const overdueIncidents = await prisma.incident.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "INVESTIGATING"] },
      createdAt: { lt: subDays(now, 7) },
    },
  });

  for (const incident of overdueIncidents) {
    // Sjekk om vi allerede har sendt varsel de siste 3 dagene
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "INCIDENT_OVERDUE",
        link: { contains: incident.id },
        createdAt: { gt: subDays(now, 3) },
      },
    });

    if (!recentNotification && incident.responsibleId) {
      await createNotification({
        tenantId,
        userId: incident.responsibleId,
        type: "INCIDENT_OVERDUE",
        title: "⚠️ Avvik trenger oppfølging",
        message: `Avviket "${incident.title}" har ikke blitt behandlet på over 7 dager. Vennligst følg opp.`,
        link: `/dashboard/incidents/${incident.id}`,
      });
      notifications++;
    }
  }

  return { type: "INCIDENT_OVERDUE", count: overdueIncidents.length, notifications };
}

// ============================================
// TILTAK - Sjekk forfalt og kommende
// ============================================

async function checkOverdueMeasures(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  const overdueMeasures = await prisma.measure.findMany({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      dueAt: { lt: startOfDay(now) },
    },
  });

  for (const measure of overdueMeasures) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "MEASURE_OVERDUE",
        link: { contains: measure.id },
        createdAt: { gt: subDays(now, 3) },
      },
    });

    if (!recentNotification && measure.responsibleId) {
      const daysOverdue = differenceInDays(now, measure.dueAt!);
      await createNotification({
        tenantId,
        userId: measure.responsibleId,
        type: "MEASURE_OVERDUE",
        title: "🚨 Tiltak forfalt!",
        message: `Tiltaket "${measure.title}" er ${daysOverdue} dager forbi fristen. Vennligst fullfør eller oppdater status.`,
        link: `/dashboard/actions`,
      });
      notifications++;
    }
  }

  return { type: "MEASURE_OVERDUE", count: overdueMeasures.length, notifications };
}

async function checkUpcomingMeasures(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in7Days = addDays(now, 7);
  let notifications = 0;

  const upcomingMeasures = await prisma.measure.findMany({
    where: {
      tenantId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      dueAt: {
        gte: startOfDay(now),
        lte: endOfDay(in7Days),
      },
    },
  });

  for (const measure of upcomingMeasures) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "MEASURE_DUE_SOON",
        link: { contains: measure.id },
        createdAt: { gt: subDays(now, 7) },
      },
    });

    if (!recentNotification && measure.responsibleId) {
      const daysUntil = differenceInDays(measure.dueAt!, now);
      await createNotification({
        tenantId,
        userId: measure.responsibleId,
        type: "MEASURE_DUE_SOON",
        title: "⏰ Tiltak forfaller snart",
        message: `Tiltaket "${measure.title}" forfaller om ${daysUntil} dag${daysUntil !== 1 ? "er" : ""}.`,
        link: `/dashboard/actions`,
      });
      notifications++;
    }
  }

  return { type: "MEASURE_DUE_SOON", count: upcomingMeasures.length, notifications };
}

// ============================================
// OPPLÆRING - Sjekk utløpende og utløpt
// ============================================

async function checkExpiringTraining(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in30Days = addDays(now, 30);
  let notifications = 0;

  const expiringTraining = await prisma.training.findMany({
    where: {
      tenantId,
      validUntil: {
        gte: startOfDay(now),
        lte: endOfDay(in30Days),
      },
    },
  });

  // Grupper etter bruker
  const userTrainings = new Map<string, typeof expiringTraining>();
  for (const training of expiringTraining) {
    if (!userTrainings.has(training.userId)) {
      userTrainings.set(training.userId, []);
    }
    userTrainings.get(training.userId)!.push(training);
  }

  for (const [userId, trainings] of userTrainings) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        userId,
        type: "TRAINING_DUE",
        createdAt: { gt: subDays(now, 14) },
      },
    });

    if (!recentNotification) {
      const titles = trainings.map(t => t.title).join(", ");
      await createNotification({
        tenantId,
        userId,
        type: "TRAINING_DUE",
        title: "📚 Opplæring utløper snart",
        message: `Følgende opplæring/sertifisering utløper innen 30 dager: ${titles}`,
        link: `/dashboard/training`,
      });
      notifications++;
    }
  }

  return { type: "TRAINING_DUE", count: expiringTraining.length, notifications };
}

async function checkExpiredTraining(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  const expiredTraining = await prisma.training.findMany({
    where: {
      tenantId,
      validUntil: { lt: startOfDay(now) },
      isRequired: true,
    },
  });

  // Varsle HMS-ansvarlig om utløpt obligatorisk opplæring
  if (expiredTraining.length > 0) {
    await notifyUsersByRole(tenantId, "HMS", {
      type: "TRAINING_EXPIRED",
      title: "🚨 Utløpt obligatorisk opplæring",
      message: `${expiredTraining.length} ansatte har utløpt obligatorisk opplæring/sertifisering som må fornyes.`,
      link: `/dashboard/training`,
    });
    notifications++;
  }

  return { type: "TRAINING_EXPIRED", count: expiredTraining.length, notifications };
}

// ============================================
// VERNERUNDER/INSPEKSJONER
// ============================================

async function checkUpcomingInspections(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in7Days = addDays(now, 7);
  let notifications = 0;

  const upcomingInspections = await prisma.inspection.findMany({
    where: {
      tenantId,
      status: "PLANNED",
      scheduledDate: {
        gte: startOfDay(now),
        lte: endOfDay(in7Days),
      },
    },
  });

  for (const inspection of upcomingInspections) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "INSPECTION_REMINDER",
        link: { contains: inspection.id },
        createdAt: { gt: subDays(now, 3) },
      },
    });

    if (!recentNotification && inspection.conductedBy) {
      const daysUntil = differenceInDays(inspection.scheduledDate!, now);
      await createNotification({
        tenantId,
        userId: inspection.conductedBy,
        type: "INSPECTION_REMINDER",
        title: "🔍 Vernerunde planlagt",
        message: `Vernerunden "${inspection.title}" er planlagt om ${daysUntil} dag${daysUntil !== 1 ? "er" : ""}.`,
        link: `/dashboard/inspections/${inspection.id}`,
      });
      notifications++;
    }
  }

  return { type: "INSPECTION_REMINDER", count: upcomingInspections.length, notifications };
}

async function checkOverdueInspections(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  // Finn inspeksjoner som skulle vært gjennomført
  const overdueInspections = await prisma.inspection.findMany({
    where: {
      tenantId,
      status: "PLANNED",
      scheduledDate: { lt: startOfDay(now) },
    },
  });

  if (overdueInspections.length > 0) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "INSPECTION_OVERDUE",
        createdAt: { gt: subDays(now, 7) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "INSPECTION_OVERDUE",
        title: "⚠️ Vernerunder ikke gjennomført",
        message: `${overdueInspections.length} vernerunde(r) er ikke gjennomført som planlagt.`,
        link: `/dashboard/inspections`,
      });
      notifications++;
    }
  }

  return { type: "INSPECTION_OVERDUE", count: overdueInspections.length, notifications };
}

async function checkInspectionFindings(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  // Finn åpne funn fra inspeksjoner med forfalt frist
  const openFindings = await prisma.inspectionFinding.findMany({
    where: {
      inspection: { tenantId },
      status: "OPEN",
      dueDate: { lt: startOfDay(now) },
    },
    include: {
      inspection: true,
    },
  });

  for (const finding of openFindings) {
    if (finding.responsibleId) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          tenantId,
          userId: finding.responsibleId,
          type: "INSPECTION_FINDING",
          link: { contains: finding.inspectionId },
          createdAt: { gt: subDays(now, 7) },
        },
      });

      if (!recentNotification) {
        await createNotification({
          tenantId,
          userId: finding.responsibleId,
          type: "INSPECTION_FINDING",
          title: "🔴 Vernerunde-funn forfalt",
          message: `Funnet "${finding.title}" fra vernerunden har forfalt frist.`,
          link: `/dashboard/inspections/${finding.inspectionId}`,
        });
        notifications++;
      }
    }
  }

  return { type: "INSPECTION_FINDING", count: openFindings.length, notifications };
}

// ============================================
// DOKUMENTER
// ============================================

async function checkDocumentReviews(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in30Days = addDays(now, 30);
  let notifications = 0;

  const documentsNeedingReview = await prisma.document.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      nextReviewDate: {
        gte: startOfDay(now),
        lte: endOfDay(in30Days),
      },
    },
  });

  if (documentsNeedingReview.length > 0) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "DOCUMENT_REVIEW_DUE",
        createdAt: { gt: subDays(now, 14) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "DOCUMENT_REVIEW_DUE",
        title: "📄 Dokumenter trenger revisjon",
        message: `${documentsNeedingReview.length} dokument(er) trenger revisjon innen 30 dager.`,
        link: `/dashboard/documents`,
      });
      notifications++;
    }
  }

  return { type: "DOCUMENT_REVIEW_DUE", count: documentsNeedingReview.length, notifications };
}

// ============================================
// KJEMIKALIER/STOFFKARTOTEK
// ============================================

async function checkChemicalReviews(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in30Days = addDays(now, 30);
  let notifications = 0;

  const chemicalsNeedingReview = await prisma.chemical.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      nextReviewDate: {
        lte: endOfDay(in30Days),
      },
    },
  });

  // Separer forfalt og kommende
  const expired = chemicalsNeedingReview.filter(c => c.nextReviewDate && c.nextReviewDate < now);
  const upcoming = chemicalsNeedingReview.filter(c => c.nextReviewDate && c.nextReviewDate >= now);

  if (expired.length > 0) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "CHEMICAL_EXPIRED",
        createdAt: { gt: subDays(now, 7) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "CHEMICAL_EXPIRED",
        title: "🧪 Kjemikalier trenger revisjon!",
        message: `${expired.length} kjemikalie(r) har forfalt revisjonsdato og trenger oppdatering.`,
        link: `/dashboard/chemicals`,
      });
      notifications++;
    }
  }

  if (upcoming.length > 0) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "CHEMICAL_SDS_REVIEW",
        createdAt: { gt: subDays(now, 14) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "CHEMICAL_SDS_REVIEW",
        title: "📋 SDS-revisjon nærmer seg",
        message: `${upcoming.length} kjemikalie(r) trenger SDS-revisjon innen 30 dager.`,
        link: `/dashboard/chemicals`,
      });
      notifications++;
    }
  }

  return { type: "CHEMICAL_SDS_REVIEW", count: chemicalsNeedingReview.length, notifications };
}

// ============================================
// RISIKOER
// ============================================

async function checkRiskReviews(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in30Days = addDays(now, 30);
  let notifications = 0;

  const risksNeedingReview = await prisma.risk.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "MITIGATING"] },
      nextReviewDate: {
        lte: endOfDay(in30Days),
      },
    },
  });

  // Finn høyrisikoer som trenger umiddelbar oppmerksomhet
  const highRisks = risksNeedingReview.filter(r => r.score && r.score >= 12);

  if (highRisks.length > 0) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "RISK_HIGH_SCORE",
        createdAt: { gt: subDays(now, 7) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "RISK_HIGH_SCORE",
        title: "🔴 Høyrisikoer trenger gjennomgang",
        message: `${highRisks.length} høyrisiko(er) trenger gjennomgang.`,
        link: `/dashboard/risks`,
      });
      notifications++;
    }
  }

  if (risksNeedingReview.length > highRisks.length) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "RISK_REVIEW_DUE",
        createdAt: { gt: subDays(now, 14) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "RISK_REVIEW_DUE",
        title: "⚠️ Risikoer trenger gjennomgang",
        message: `${risksNeedingReview.length} risiko(er) trenger gjennomgang innen 30 dager.`,
        link: `/dashboard/risks`,
      });
      notifications++;
    }
  }

  return { type: "RISK_REVIEW_DUE", count: risksNeedingReview.length, notifications };
}

// ============================================
// MÅL/KPI
// ============================================

async function checkGoalsAtRisk(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  const goalsAtRisk = await prisma.goal.findMany({
    where: {
      tenantId,
      status: "AT_RISK",
      year: new Date().getFullYear(),
    },
  });

  if (goalsAtRisk.length > 0) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "GOAL_AT_RISK",
        createdAt: { gt: subDays(now, 7) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "ADMIN", {
        type: "GOAL_AT_RISK",
        title: "🎯 Mål i fare",
        message: `${goalsAtRisk.length} mål er markert som \"i fare\" og trenger oppfølging.`,
        link: `/dashboard/goals`,
      });
      notifications++;
    }
  }

  return { type: "GOAL_AT_RISK", count: goalsAtRisk.length, notifications };
}

// ============================================
// MØTER
// ============================================

async function checkUpcomingMeetings(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in7Days = addDays(now, 7);
  let notifications = 0;

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      tenantId,
      status: "PLANNED",
      scheduledDate: {
        gte: startOfDay(now),
        lte: endOfDay(in7Days),
      },
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });

  for (const meeting of upcomingMeetings) {
    const daysUntil = differenceInDays(meeting.scheduledDate, now);
    
    // Send påminnelse til alle deltakere
    for (const participant of meeting.participants) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          tenantId,
          userId: participant.userId,
          type: "MEETING_REMINDER",
          link: { contains: meeting.id },
          createdAt: { gt: subDays(now, 3) },
        },
      });

      if (!recentNotification) {
        await createNotification({
          tenantId,
          userId: participant.userId,
          type: "MEETING_REMINDER",
          title: `📅 ${meeting.type}-møte om ${daysUntil} dag${daysUntil !== 1 ? "er" : ""}`,
          message: `Du er invitert til "${meeting.title}" ${meeting.location ? `på ${meeting.location}` : ""}.`,
          link: `/dashboard/meetings/${meeting.id}`,
        });
        notifications++;
      }
    }
  }

  return { type: "MEETING_REMINDER", count: upcomingMeetings.length, notifications };
}

// ============================================
// REVISJONER
// ============================================

async function checkUpcomingAudits(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in14Days = addDays(now, 14);
  let notifications = 0;

  const upcomingAudits = await prisma.audit.findMany({
    where: {
      tenantId,
      status: "PLANNED",
      scheduledDate: {
        gte: startOfDay(now),
        lte: endOfDay(in14Days),
      },
    },
  });

  for (const audit of upcomingAudits) {
    if (audit.leadAuditorId) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          tenantId,
          userId: audit.leadAuditorId,
          type: "AUDIT_REMINDER",
          link: { contains: audit.id },
          createdAt: { gt: subDays(now, 7) },
        },
      });

      if (!recentNotification) {
        const daysUntil = differenceInDays(audit.scheduledDate!, now);
        await createNotification({
          tenantId,
          userId: audit.leadAuditorId,
          type: "AUDIT_REMINDER",
          title: "📋 Revisjon planlagt",
          message: `Revisjonen "${audit.title}" er planlagt om ${daysUntil} dag${daysUntil !== 1 ? "er" : ""}.`,
          link: `/dashboard/audits/${audit.id}`,
        });
        notifications++;
      }
    }
  }

  return { type: "AUDIT_REMINDER", count: upcomingAudits.length, notifications };
}

async function checkOpenAuditFindings(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  let notifications = 0;

  const openFindings = await prisma.auditFinding.findMany({
    where: {
      audit: { tenantId },
      status: "OPEN",
      dueDate: { lt: startOfDay(now) },
    },
    include: {
      audit: true,
    },
  });

  for (const finding of openFindings) {
    if (finding.responsibleId) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          tenantId,
          userId: finding.responsibleId,
          type: "AUDIT_FINDING_OPEN",
          link: { contains: finding.auditId },
          createdAt: { gt: subDays(now, 7) },
        },
      });

      if (!recentNotification) {
        await createNotification({
          tenantId,
          userId: finding.responsibleId,
          type: "AUDIT_FINDING_OPEN",
          title: "🔴 Revisjonsfunn forfalt",
          message: `Revisjonsfunnet "${finding.description?.substring(0, 50)}..." har forfalt frist.`,
          link: `/dashboard/audits/${finding.auditId}`,
        });
        notifications++;
      }
    }
  }

  return { type: "AUDIT_FINDING_OPEN", count: openFindings.length, notifications };
}

// ============================================
// LEDELSENS GJENNOMGANG
// ============================================

async function checkManagementReviewDue(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const in30Days = addDays(now, 30);
  let notifications = 0;

  // Finn siste gjennomgang
  const lastReview = await prisma.managementReview.findFirst({
    where: {
      tenantId,
      status: "COMPLETED",
    },
    orderBy: { reviewDate: "desc" },
  });

  // Finn planlagte gjennomganger
  const upcomingReviews = await prisma.managementReview.findMany({
    where: {
      tenantId,
      status: { in: ["PLANNED", "IN_PROGRESS"] },
      reviewDate: {
        gte: startOfDay(now),
        lte: endOfDay(in30Days),
      },
    },
  });

  // Hent tenant-konfig for årlig HMS-plan / frekvens
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      hmsAnnualPlanEnabled: true,
      managementReviewFrequencyMonths: true,
    },
  });

  if (!tenant || !tenant.hmsAnnualPlanEnabled) {
    return {
      type: "MGMT_REVIEW_DUE",
      count: 0,
      notifications: 0,
    };
  }

  const frequencyMonths = tenant.managementReviewFrequencyMonths || 12;

  // Sjekk om det er på tide med ny gjennomgang basert på tenant-spesifikk frekvens
  const lastReviewDate = lastReview?.reviewDate || new Date(0);
  const nextPlannedReviewDate =
    lastReview && frequencyMonths > 0
      ? addMonths(lastReviewDate, frequencyMonths)
      : lastReviewDate;

  const daysSinceLastReview = differenceInDays(now, lastReviewDate);
  const isDueForNewReview =
    (!lastReview && upcomingReviews.length === 0) ||
    (lastReview &&
      frequencyMonths > 0 &&
      now > nextPlannedReviewDate &&
      upcomingReviews.length === 0);

  if (isDueForNewReview) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "MGMT_REVIEW_DUE",
        createdAt: { gt: subDays(now, 30) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "ADMIN", {
        type: "MGMT_REVIEW_DUE",
        title: "📊 Tid for ledelsens gjennomgang",
        message: `Det er over ${daysSinceLastReview} dager siden siste ledelsens gjennomgang. Det anbefales å planlegge en ny.`,
        link: `/dashboard/management-reviews`,
      });
      notifications++;
    }
  }

  // Varsle om kommende planlagte gjennomganger
  for (const review of upcomingReviews) {
    const recentNotification = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "MGMT_REVIEW_SCHEDULED",
        link: { contains: review.id },
        createdAt: { gt: subDays(now, 14) },
      },
    });

    if (!recentNotification) {
      await notifyUsersByRole(tenantId, "ADMIN", {
        type: "MGMT_REVIEW_SCHEDULED",
        title: "📊 Ledelsens gjennomgang nærmer seg",
        message: `"${review.title}" er planlagt til ${new Date(review.reviewDate).toLocaleDateString("nb-NO")}.`,
        link: `/dashboard/management-reviews/${review.id}`,
      });
      notifications++;
    }
  }

  return { 
    type: "MGMT_REVIEW_DUE", 
    count: daysSinceLastReview > 90 ? 1 : upcomingReviews.length, 
    notifications 
  };
}

// ============================================
// EKSPORTER HJELPEFUNKSJONER
// ============================================

export async function getTaskSummaryForUser(userId: string, tenantId: string) {
  const now = new Date();
  const in7Days = addDays(now, 7);
  const in30Days = addDays(now, 30);

  const [
    overdueIncidents,
    overdueMeasures,
    upcomingMeasures,
    expiringTraining,
    upcomingInspections,
    upcomingMeetings,
    upcomingAudits,
  ] = await Promise.all([
    // Mine avvik
    prisma.incident.count({
      where: {
        tenantId,
        responsibleId: userId,
        status: { in: ["OPEN", "INVESTIGATING"] },
      },
    }),
    // Mine forfalte tiltak
    prisma.measure.count({
      where: {
        tenantId,
        responsibleId: userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueAt: { lt: startOfDay(now) },
      },
    }),
    // Mine kommende tiltak
    prisma.measure.count({
      where: {
        tenantId,
        responsibleId: userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueAt: {
          gte: startOfDay(now),
          lte: endOfDay(in7Days),
        },
      },
    }),
    // Min utløpende opplæring
    prisma.training.count({
      where: {
        tenantId,
        userId,
        validUntil: {
          gte: startOfDay(now),
          lte: endOfDay(in30Days),
        },
      },
    }),
    // Mine kommende inspeksjoner
    prisma.inspection.count({
      where: {
        tenantId,
        conductedBy: userId,
        status: "PLANNED",
        scheduledDate: {
          gte: startOfDay(now),
          lte: endOfDay(in7Days),
        },
      },
    }),
    // Mine kommende møter
    prisma.meetingParticipant.count({
      where: {
        userId,
        meeting: {
          tenantId,
          status: "PLANNED",
          scheduledDate: {
            gte: startOfDay(now),
            lte: endOfDay(in7Days),
          },
        },
      },
    }),
    // Mine kommende revisjoner
    prisma.audit.count({
      where: {
        tenantId,
        leadAuditorId: userId,
        status: "PLANNED",
        scheduledDate: {
          gte: startOfDay(now),
          lte: endOfDay(in14Days),
        },
      },
    }),
  ]);

  return {
    overdueIncidents,
    overdueMeasures,
    upcomingMeasures,
    expiringTraining,
    upcomingInspections,
    upcomingMeetings,
    upcomingAudits,
    totalTasks: overdueIncidents + overdueMeasures + upcomingMeasures + upcomingInspections + upcomingMeetings + upcomingAudits,
    criticalTasks: overdueMeasures + overdueIncidents,
  };
}

const in14Days = addDays(new Date(), 14);

// ─── Medarbeidersamtale – varsel ─────────────────────────────────────────────
/**
 * Sjekker alle ansatte i tenanten:
 *   1. Varsler leder/HMS hvis en ansatt ikke har hatt samtale siste 12 måneder
 *   2. Varsler ansatt hvis planlagt samtale er om ≤ 14 dager
 *   3. Varsler ansatt og leder om samtaler som venter på signering
 *
 * Hjemmel: AML § 4-2 – medarbeidersamtale anbefales minimum en gang per år
 */
async function checkEmployeeReviewsDue(tenantId: string): Promise<AlertResult> {
  const now = new Date();
  const twelveMonthsAgo = addDays(now, -365);
  const in14DaysDate = addDays(now, 14);
  let notifications = 0;

  // ── 1. Ansatte uten samtale siste 12 måneder ──────────────────────────────
  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId },
    select: { userId: true, role: true },
  });

  for (const ut of tenantUsers) {
    // Kun sjekk ansatte (ikke admin/superadmin)
    if (ut.role === "ADMIN") continue;

    const lastReview = await prisma.employeeReview.findFirst({
      where: {
        tenantId,
        employeeId: ut.userId,
        status: { in: ["GJENNOMFORT", "SIGNERT"] },
        completedDate: { gte: twelveMonthsAgo },
      },
      select: { id: true },
    });

    if (!lastReview) {
      // Sjekk om vi allerede har varslet nylig (siste 30 dager)
      const recentAlert = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: "EMPLOYEE_REVIEW_DUE",
          userId: ut.userId,
          createdAt: { gt: addDays(now, -30) },
        },
        select: { id: true },
      });
      if (recentAlert) continue;

      // Varsle ansatten selv
      await createNotification({
        tenantId,
        userId: ut.userId,
        type: "EMPLOYEE_REVIEW_DUE",
        title: "Medarbeidersamtale forfall",
        message:
          "Du har ikke hatt medarbeidersamtale med din leder siste 12 måneder. Ta kontakt med lederen din for å planlegge en samtale (AML § 4-2).",
        link: "/ansatt/medarbeidersamtale",
      });
      notifications++;

      // Varsle HMS-rollen
      await notifyUsersByRole(tenantId, "HMS", {
        type: "EMPLOYEE_REVIEW_DUE",
        title: "Medarbeidersamtale ikke gjennomført",
        message: `En ansatt har ikke hatt medarbeidersamtale på over 12 måneder. Følg opp i oversikten.`,
        link: "/dashboard/medarbeidersamtale",
      });
      notifications++;
    }
  }

  // ── 2. Planlagte samtaler som nærmer seg (≤ 14 dager) ────────────────────
  const upcoming = await prisma.employeeReview.findMany({
    where: {
      tenantId,
      status: { in: ["PLANLAGT", "FORBEREDT"] },
      scheduledDate: {
        gte: now,
        lte: in14DaysDate,
      },
    },
    select: {
      id: true,
      scheduledDate: true,
      employeeId: true,
      reviewerId: true,
    },
  });

  for (const review of upcoming) {
    const recentAlert = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "EMPLOYEE_REVIEW_UPCOMING",
        link: { contains: review.id },
        createdAt: { gt: addDays(now, -7) },
      },
      select: { id: true },
    });
    if (recentAlert) continue;

    const dateText = new Date(review.scheduledDate).toLocaleDateString("nb-NO");

    await createNotification({
      tenantId,
      userId: review.employeeId,
      type: "EMPLOYEE_REVIEW_UPCOMING",
      title: "Medarbeidersamtale nærmer seg",
      message: `Du har medarbeidersamtale planlagt ${dateText}. Husk å fylle inn din forberedelse i forkant.`,
      link: `/ansatt/medarbeidersamtale/${review.id}`,
    });
    await createNotification({
      tenantId,
      userId: review.reviewerId,
      type: "EMPLOYEE_REVIEW_UPCOMING",
      title: "Medarbeidersamtale nærmer seg",
      message: `Du har planlagt en medarbeidersamtale ${dateText}. Gjennomgå forberedelsen til den ansatte i forkant.`,
      link: `/dashboard/medarbeidersamtale/${review.id}`,
    });
    notifications += 2;
  }

  // ── 3. Samtaler som venter på signering ───────────────────────────────────
  const pendingSign = await prisma.employeeReview.findMany({
    where: {
      tenantId,
      status: "GJENNOMFORT",
      OR: [{ signertAvAnsatt: false }, { signertAvLeder: false }],
      completedDate: { lte: addDays(now, -3) }, // Venter mer enn 3 dager
    },
    select: {
      id: true,
      employeeId: true,
      reviewerId: true,
      signertAvAnsatt: true,
      signertAvLeder: true,
    },
  });

  for (const review of pendingSign) {
    const recentAlert = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "EMPLOYEE_REVIEW_SIGN",
        link: { contains: review.id },
        createdAt: { gt: addDays(now, -7) },
      },
      select: { id: true },
    });
    if (recentAlert) continue;

    if (!review.signertAvAnsatt) {
      await createNotification({
        tenantId,
        userId: review.employeeId,
        type: "EMPLOYEE_REVIEW_SIGN",
        title: "Medarbeidersamtale venter på din signatur",
        message: "Samtalen er gjennomført. Gå inn og bekreft at du har mottatt referatet.",
        link: `/ansatt/medarbeidersamtale/${review.id}`,
      });
      notifications++;
    }
    if (!review.signertAvLeder) {
      await createNotification({
        tenantId,
        userId: review.reviewerId,
        type: "EMPLOYEE_REVIEW_SIGN",
        title: "Medarbeidersamtale venter på din signatur",
        message: "Samtalen er gjennomført. Gå inn og signer referatet.",
        link: `/dashboard/medarbeidersamtale/${review.id}`,
      });
      notifications++;
    }
  }

  return {
    type: "employee_reviews_due",
    count: upcoming.length + pendingSign.length,
    notifications,
  };
}

