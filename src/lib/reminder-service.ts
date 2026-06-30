import { prisma } from "@/lib/db";
import { addDays, startOfDay, endOfDay } from "date-fns";

/**
 * Reminder Service
 * Håndterer oppretting og sending av påminnelser for møter, inspeksjoner, revisjoner og tiltak
 */

interface ReminderConfig {
  entityType: "Meeting" | "Inspection" | "Audit" | "Measure";
  entityId: string;
  tenantId: string;
  userIds: string[];  // Hvem som skal motta påminnelsen
  scheduledDate: Date; // Når hendelsen skal skje
  title: string;
  description?: string;
}

/**
 * Opprett planlagte påminnelser basert på brukerpreferanser
 */
export async function createReminders(config: ReminderConfig) {
  const { entityType, entityId, tenantId, userIds, scheduledDate, title } = config;

  // Hent brukere med deres varslingsinnstillinger (fra UserTenant - tenant-spesifikk)
  const userTenants = await prisma.userTenant.findMany({
    where: {
      userId: { in: userIds },
      tenantId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true, // Fallback hvis ikke satt på UserTenant
        },
      },
    },
  });

  const remindersToCreate = [];

  for (const userTenant of userTenants) {
    const user = userTenant.user;
    
    // Sjekk om bruker vil ha varsler for denne typen hendelse
    let shouldNotify = false;
    let reminderType: any;

    switch (entityType) {
      case "Meeting":
        shouldNotify = userTenant.notifyMeetings;
        reminderType = "MEETING_UPCOMING";
        break;
      case "Inspection":
        shouldNotify = userTenant.notifyInspections;
        reminderType = "INSPECTION_UPCOMING";
        break;
      case "Audit":
        shouldNotify = userTenant.notifyAudits;
        reminderType = "AUDIT_UPCOMING";
        break;
      case "Measure":
        shouldNotify = userTenant.notifyMeasures;
        reminderType = "MEASURE_DUE_SOON";
        break;
    }

    if (!shouldNotify) continue;

    // Hvis bruker ikke vil ha noen form for varsler, hopp over
    if (!userTenant.notifyByEmail && !userTenant.notifyBySms) continue;

    // Beregn når påminnelsen skal sendes
    const reminderDays = userTenant.reminderDaysBefore;
    const scheduledFor = addDays(startOfDay(scheduledDate), -reminderDays);

    // Ikke opprett påminnelser for datoer i fortiden
    if (scheduledFor < new Date()) continue;

    // Sjekk om påminnelse allerede eksisterer
    const existing = await prisma.scheduledReminder.findFirst({
      where: {
        userId: user.id,
        entityType,
        entityId,
        status: { in: ["PENDING", "SENT"] },
      },
    });

    if (existing) continue; // Skip hvis allerede opprettet

    remindersToCreate.push({
      tenantId,
      userId: user.id,
      type: reminderType,
      entityType,
      entityId,
      title,
      message: config.description,
      scheduledFor,
      status: "PENDING",
    });
  }

  if (remindersToCreate.length > 0) {
    await prisma.scheduledReminder.createMany({
      data: remindersToCreate,
    });
  }

  return { created: remindersToCreate.length };
}

/**
 * Slett påminnelser for en hendelse (f.eks. hvis møtet blir kansellert)
 */
export async function cancelReminders(entityType: string, entityId: string) {
  await prisma.scheduledReminder.updateMany({
    where: {
      entityType,
      entityId,
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
    },
  });
}

/**
 * Send ventende påminnelser (kalles av scheduled job)
 */
export async function sendPendingReminders() {
  const now = new Date();
  const endOfToday = endOfDay(now);

  // Hent alle påminnelser som skal sendes i dag
  const reminders = await prisma.scheduledReminder.findMany({
    where: {
      status: "PENDING",
      scheduledFor: {
        lte: endOfToday,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
        },
      },
      tenant: true,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const reminder of reminders) {
    try {
      const user = reminder.user;

      if (!user) {
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: "FAILED",
            error: "Bruker ikke funnet",
          },
        });
        failed++;
        continue;
      }

      // Hent detaljer om hendelsen
      const entityDetails = await getEntityDetails(
        reminder.entityType,
        reminder.entityId
      );

      if (!entityDetails) {
        await prisma.scheduledReminder.update({
          where: { id: reminder.id },
          data: {
            status: "FAILED",
            error: "Hendelse ikke funnet",
          },
        });
        failed++;
        continue;
      }

      // Les preferanser fra UserTenant (korrekt kilde for per-tenant innstillinger)
      const userTenant = await prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: reminder.tenantId,
          },
        },
        select: {
          notifyByEmail: true,
          notifyBySms: true,
          phone: true,
        },
      });

      const notifyByEmail = userTenant?.notifyByEmail ?? false;
      const notifyBySms = userTenant?.notifyBySms ?? false;
      // Telefon: bruk UserTenant-nummer først, fall tilbake på User
      const rawPhone = userTenant?.phone ?? user.phone ?? null;

      let emailSent = false;
      let smsSent = false;

      // Send e-post hvis aktivert
      if (notifyByEmail) {
        await sendReminderEmail(user.email, reminder.title, entityDetails);
        emailSent = true;
      }

      // Send SMS hvis aktivert og gyldig telefonnummer finnes
      if (notifyBySms && rawPhone) {
        const { formatPhoneNumber } = await import("@/lib/sms");
        const phone = formatPhoneNumber(rawPhone);
        if (phone) {
          await sendReminderSms(phone, reminder.title, entityDetails);
          smsSent = true;
        }
      }

      // Oppdater påminnelse som sendt
      await prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentViaEmail: emailSent,
          sentViaSms: smsSent,
        },
      });

      sent++;
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
      await prisma.scheduledReminder.update({
        where: { id: reminder.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Ukjent feil",
        },
      });
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Hent detaljer om en hendelse
 */
async function getEntityDetails(entityType: string, entityId: string) {
  switch (entityType) {
    case "Meeting":
      return await prisma.meeting.findUnique({
        where: { id: entityId },
        select: {
          title: true,
          scheduledDate: true,
          location: true,
          meetingLink: true,
        },
      });
    case "Inspection":
      return await prisma.inspection.findUnique({
        where: { id: entityId },
        select: {
          title: true,
          scheduledDate: true,
          location: true,
        },
      });
    case "Audit":
      return await prisma.audit.findUnique({
        where: { id: entityId },
        select: {
          title: true,
          scheduledDate: true,
          area: true,
        },
      });
    case "Measure":
      return await prisma.measure.findUnique({
        where: { id: entityId },
        select: {
          title: true,
          dueAt: true,
          description: true,
        },
      });
    default:
      return null;
  }
}

/**
 * Send påminnelse via e-post
 */
async function sendReminderEmail(
  email: string,
  reminderType: string,
  entityDetails: any
) {
  const { sendEmail } = await import("@/lib/email");

  let subject = "";
  let message = "";

  switch (reminderType) {
    case "MEETING_UPCOMING":
      subject = `Påminnelse: ${entityDetails.title}`;
      message = `Du har et møte planlagt: ${entityDetails.title}\n\nTidspunkt: ${new Date(entityDetails.scheduledDate).toLocaleString("nb-NO")}\nSted: ${entityDetails.location || "Se møtedetaljer"}`;
      break;
    case "INSPECTION_UPCOMING":
      subject = `Påminnelse: ${entityDetails.title}`;
      message = `Du har en vernerunde/inspeksjon planlagt: ${entityDetails.title}\n\nTidspunkt: ${new Date(entityDetails.scheduledDate).toLocaleString("nb-NO")}\nSted: ${entityDetails.location || "Se detaljer"}`;
      break;
    case "AUDIT_UPCOMING":
      subject = `Påminnelse: Revisjon - ${entityDetails.title}`;
      message = `Du har en revisjon planlagt: ${entityDetails.title}\n\nTidspunkt: ${new Date(entityDetails.scheduledDate).toLocaleString("nb-NO")}\nOmråde: ${entityDetails.area}`;
      break;
    case "MEASURE_DUE_SOON":
      subject = `Påminnelse: Tiltak forfaller snart`;
      message = `Du har et tiltak som forfaller snart: ${entityDetails.title}\n\nFrist: ${new Date(entityDetails.dueAt).toLocaleString("nb-NO")}`;
      break;
  }

  await sendEmail({
    to: email,
    subject,
    html: `<p>${message.replace(/\n/g, "<br>")}</p>`,
  });
}

/**
 * Send påminnelse via SMS
 */
async function sendReminderSms(
  phone: string,
  reminderType: string,
  entityDetails: any
) {
  const { sendSms } = await import("@/lib/sms");

  let message = "";

  switch (reminderType) {
    case "MEETING_UPCOMING":
      message = `HMS Nova: Møte i morgen - ${entityDetails.title}`;
      break;
    case "INSPECTION_UPCOMING":
      message = `HMS Nova: Vernerunde i morgen - ${entityDetails.title}`;
      break;
    case "AUDIT_UPCOMING":
      message = `HMS Nova: Revisjon i morgen - ${entityDetails.title}`;
      break;
    case "MEASURE_DUE_SOON":
      message = `HMS Nova: Tiltak forfaller snart - ${entityDetails.title}`;
      break;
  }

  await sendSms({
    to: phone,
    message,
  });
}

