import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { addDays, subDays, startOfDay, endOfDay, format } from "date-fns";
import { nb } from "date-fns/locale";

/**
 * HMS Nova Email Digest Service
 * 
 * Sender daglige og ukentlige sammendrag til brukere basert på deres preferanser.
 */

interface DigestData {
  userId: string;
  email: string;
  name: string;
  tenantName: string;
  overdueIncidents: number;
  openIncidents: number;
  overdueMeasures: number;
  upcomingMeasures: { title: string; dueAt: Date }[];
  expiringTraining: { title: string; validUntil: Date }[];
  upcomingInspections: { title: string; scheduledDate: Date }[];
  upcomingMeetings: { title: string; scheduledDate: Date; type: string }[];
  upcomingAudits: { title: string; scheduledDate: Date }[];
  documentsNeedingReview: number;
  chemicalsNeedingReview: number;
  risksNeedingReview: number;
  unreadNotifications: number;
}

export async function sendDigestEmails(type: "DAILY" | "WEEKLY" = "DAILY") {
  console.log(`📧 Starting ${type} email digest...`);

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  let emailsSent = 0;
  let errors = 0;

  for (const tenant of tenants) {
    for (const userTenant of tenant.users) {
      const user = userTenant.user;

      // Sjekk om brukeren vil ha digest-varsler (fra UserTenant - tenant-spesifikk)
      if (!userTenant.notifyByEmail) continue;
      if (type === "DAILY" && !userTenant.dailyDigest) continue;
      if (type === "WEEKLY" && !userTenant.weeklyDigest) continue;

      try {
        const digestData = await gatherDigestData(
          user.id,
          tenant.id,
          tenant.name,
          type,
          tenant.trainingReminderDaysBefore,
        );
        
        // Hopp over hvis ingenting å rapportere
        if (!hasContentToReport(digestData)) continue;

        await sendDigestEmail(digestData, type);
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send digest to ${user.email}:`, error);
        errors++;
      }
    }
  }

  console.log(`✅ ${type} digest completed. Sent: ${emailsSent}, Errors: ${errors}`);
  return { emailsSent, errors };
}

async function gatherDigestData(
  userId: string, 
  tenantId: string, 
  tenantName: string,
  type: "DAILY" | "WEEKLY",
  trainingReminderDaysBefore = 30,
): Promise<DigestData> {
  const now = new Date();
  const lookAhead = type === "DAILY" ? 7 : 14;
  const futureDate = addDays(now, lookAhead);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  const [
    overdueIncidents,
    openIncidents,
    overdueMeasures,
    upcomingMeasuresData,
    expiringTrainingData,
    upcomingInspectionsData,
    upcomingMeetingsData,
    upcomingAuditsData,
    documentsNeedingReview,
    chemicalsNeedingReview,
    risksNeedingReview,
    unreadNotifications,
  ] = await Promise.all([
    // Forfalte avvik (ansvarlig)
    prisma.incident.count({
      where: {
        tenantId,
        responsibleId: userId,
        status: { in: ["OPEN", "INVESTIGATING"] },
        createdAt: { lt: subDays(now, 7) },
      },
    }),
    // Åpne avvik (ansvarlig)
    prisma.incident.count({
      where: {
        tenantId,
        responsibleId: userId,
        status: { in: ["OPEN", "INVESTIGATING"] },
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
    // Kommende tiltak
    prisma.measure.findMany({
      where: {
        tenantId,
        responsibleId: userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueAt: {
          gte: startOfDay(now),
          lte: endOfDay(futureDate),
        },
      },
      select: { title: true, dueAt: true },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    // Utløpende opplæring
    prisma.training.findMany({
      where: {
        tenantId,
        userId,
        validUntil: {
          gte: startOfDay(now),
          lte: endOfDay(addDays(now, trainingReminderDaysBefore)),
        },
      },
      select: { title: true, validUntil: true },
      orderBy: { validUntil: "asc" },
      take: 5,
    }),
    // Kommende inspeksjoner
    prisma.inspection.findMany({
      where: {
        tenantId,
        conductedBy: userId,
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        scheduledDate: {
          gte: startOfDay(now),
          lte: endOfDay(futureDate),
        },
      },
      select: { title: true, scheduledDate: true },
      orderBy: { scheduledDate: "asc" },
      take: 5,
    }),
    // Kommende møter
    prisma.meeting.findMany({
      where: {
        tenantId,
        participants: { some: { userId } },
        status: { in: ["PLANNED", "IN_PROGRESS"] },
        scheduledDate: {
          gte: startOfDay(now),
          lte: endOfDay(futureDate),
        },
      },
      select: { title: true, scheduledDate: true, type: true },
      orderBy: { scheduledDate: "asc" },
      take: 5,
    }),
    // Kommende revisjoner
    prisma.audit.findMany({
      where: {
        tenantId,
        leadAuditorId: userId,
        status: "PLANNED",
        scheduledDate: {
          gte: startOfDay(now),
          lte: endOfDay(futureDate),
        },
      },
      select: { title: true, scheduledDate: true },
      orderBy: { scheduledDate: "asc" },
      take: 5,
    }),
    // Dokumenter som trenger revisjon (kun for HMS/Admin)
    prisma.document.count({
      where: {
        tenantId,
        status: "APPROVED",
        nextReviewDate: { lte: endOfDay(addDays(now, 30)) },
      },
    }),
    // Kjemikalier som trenger revisjon
    prisma.chemical.count({
      where: {
        tenantId,
        status: "ACTIVE",
        nextReviewDate: { lte: endOfDay(addDays(now, 30)) },
      },
    }),
    // Risikoer som trenger gjennomgang
    prisma.risk.count({
      where: {
        tenantId,
        status: { in: ["OPEN", "MITIGATING"] },
        nextReviewDate: { lte: endOfDay(addDays(now, 30)) },
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

  return {
    userId,
    email: user?.email || "",
    name: user?.name || "Bruker",
    tenantName,
    overdueIncidents,
    openIncidents,
    overdueMeasures,
    upcomingMeasures: upcomingMeasuresData.map(m => ({ 
      title: m.title, 
      dueAt: m.dueAt! 
    })),
    expiringTraining: expiringTrainingData.map(t => ({ 
      title: t.title, 
      validUntil: t.validUntil! 
    })),
    upcomingInspections: upcomingInspectionsData.map(i => ({ 
      title: i.title, 
      scheduledDate: i.scheduledDate! 
    })),
    upcomingMeetings: upcomingMeetingsData.map(m => ({ 
      title: m.title, 
      scheduledDate: m.scheduledDate, 
      type: m.type 
    })),
    upcomingAudits: upcomingAuditsData.map(a => ({ 
      title: a.title, 
      scheduledDate: a.scheduledDate! 
    })),
    documentsNeedingReview,
    chemicalsNeedingReview,
    risksNeedingReview,
    unreadNotifications,
  };
}

function hasContentToReport(data: DigestData): boolean {
  return (
    data.overdueIncidents > 0 ||
    data.overdueMeasures > 0 ||
    data.upcomingMeasures.length > 0 ||
    data.expiringTraining.length > 0 ||
    data.upcomingInspections.length > 0 ||
    data.upcomingMeetings.length > 0 ||
    data.upcomingAudits.length > 0 ||
    data.documentsNeedingReview > 0 ||
    data.chemicalsNeedingReview > 0 ||
    data.risksNeedingReview > 0
  );
}

async function sendDigestEmail(data: DigestData, type: "DAILY" | "WEEKLY") {
  const subject = type === "DAILY" 
    ? `HMS Nova - Daglig sammendrag for ${data.tenantName}`
    : `HMS Nova - Ukentlig sammendrag for ${data.tenantName}`;

  const html = generateDigestHtml(data, type);

  await sendEmail({
    to: data.email,
    subject,
    html,
  });
}

function generateDigestHtml(data: DigestData, type: "DAILY" | "WEEKLY"): string {
  const today = format(new Date(), "EEEE d. MMMM yyyy", { locale: nb });
  const periodText = type === "DAILY" ? "de neste 7 dagene" : "de neste 14 dagene";

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { background: #f8fafc; padding: 20px; border-radius: 0 0 12px 12px; }
        .section { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .section-title { font-size: 16px; font-weight: 600; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
        .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; margin-bottom: 8px; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin-bottom: 8px; }
        .info { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 4px; margin-bottom: 8px; }
        .item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .item:last-child { border-bottom: none; }
        .item-title { font-weight: 500; }
        .item-date { color: #6b7280; font-size: 14px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-red { background: #fee2e2; color: #dc2626; }
        .badge-yellow { background: #fef3c7; color: #d97706; }
        .badge-blue { background: #dbeafe; color: #2563eb; }
        .cta { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 16px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Hei, ${data.name}! 👋</h1>
        <p>${today} - ${type === "DAILY" ? "Daglig" : "Ukentlig"} sammendrag for ${data.tenantName}</p>
      </div>
      <div class="content">
  `;

  // Kritiske varsler
  if (data.overdueIncidents > 0 || data.overdueMeasures > 0) {
    html += `
      <div class="section">
        <div class="section-title">🚨 Krever umiddelbar oppmerksomhet</div>
    `;
    
    if (data.overdueIncidents > 0) {
      html += `
        <div class="alert">
          <strong>${data.overdueIncidents} avvik</strong> venter på behandling i mer enn 7 dager
        </div>
      `;
    }
    
    if (data.overdueMeasures > 0) {
      html += `
        <div class="alert">
          <strong>${data.overdueMeasures} tiltak</strong> har forfalt frist
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // Kommende tiltak
  if (data.upcomingMeasures.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">✅ Tiltak som forfaller ${periodText}</div>
    `;
    
    for (const measure of data.upcomingMeasures) {
      html += `
        <div class="item">
          <div class="item-title">${measure.title}</div>
          <div class="item-date">Frist: ${format(new Date(measure.dueAt), "d. MMMM yyyy", { locale: nb })}</div>
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // Kommende møter
  if (data.upcomingMeetings.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">📅 Kommende møter</div>
    `;
    
    for (const meeting of data.upcomingMeetings) {
      html += `
        <div class="item">
          <div class="item-title">${meeting.title} <span class="badge badge-blue">${meeting.type}</span></div>
          <div class="item-date">${format(new Date(meeting.scheduledDate), "EEEE d. MMMM 'kl.' HH:mm", { locale: nb })}</div>
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // Kommende inspeksjoner
  if (data.upcomingInspections.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">🔍 Planlagte vernerunder</div>
    `;
    
    for (const inspection of data.upcomingInspections) {
      html += `
        <div class="item">
          <div class="item-title">${inspection.title}</div>
          <div class="item-date">${format(new Date(inspection.scheduledDate), "d. MMMM yyyy", { locale: nb })}</div>
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // Kommende revisjoner
  if (data.upcomingAudits.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">📋 Planlagte revisjoner</div>
    `;
    
    for (const audit of data.upcomingAudits) {
      html += `
        <div class="item">
          <div class="item-title">${audit.title}</div>
          <div class="item-date">${format(new Date(audit.scheduledDate), "d. MMMM yyyy", { locale: nb })}</div>
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // Utløpende opplæring
  if (data.expiringTraining.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">📚 Opplæring som utløper snart</div>
    `;
    
    for (const training of data.expiringTraining) {
      html += `
        <div class="item">
          <div class="item-title">${training.title}</div>
          <div class="item-date">Utløper: ${format(new Date(training.validUntil), "d. MMMM yyyy", { locale: nb })}</div>
        </div>
      `;
    }
    
    html += `</div>`;
  }

  // Andre varsler
  if (data.documentsNeedingReview > 0 || data.chemicalsNeedingReview > 0 || data.risksNeedingReview > 0) {
    html += `
      <div class="section">
        <div class="section-title">⚠️ Trenger gjennomgang</div>
    `;
    
    if (data.documentsNeedingReview > 0) {
      html += `<div class="warning">${data.documentsNeedingReview} dokument(er) trenger revisjon</div>`;
    }
    if (data.chemicalsNeedingReview > 0) {
      html += `<div class="warning">${data.chemicalsNeedingReview} kjemikalie(r) trenger SDS-oppdatering</div>`;
    }
    if (data.risksNeedingReview > 0) {
      html += `<div class="warning">${data.risksNeedingReview} risiko(er) trenger gjennomgang</div>`;
    }
    
    html += `</div>`;
  }

  // Uleste varsler
  if (data.unreadNotifications > 0) {
    html += `
      <div class="section">
        <div class="section-title">🔔 Uleste varsler</div>
        <div class="info">Du har <strong>${data.unreadNotifications}</strong> uleste varsler i HMS Nova</div>
      </div>
    `;
  }

  html += `
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.hmsnova.no"}/dashboard" class="cta">
          Gå til HMS Nova →
        </a>
      </div>
      <div class="footer">
        <p>Dette er en automatisk generert e-post fra HMS Nova.</p>
        <p>Du kan endre varslingsinnstillingene dine i <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://www.hmsnova.no"}/dashboard/settings">innstillinger</a>.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

// Eksporter for testing
export { gatherDigestData, hasContentToReport };

