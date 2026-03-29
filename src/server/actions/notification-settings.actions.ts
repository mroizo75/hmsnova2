"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { getRequiredTenantContext } from "@/lib/tenant-context";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext().catch(() => null);
  if (!tenantContext) {
    return { error: "Ikke autentisert" };
  }

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: {
      tenants: true,
    },
  });

  if (!user || user.tenants.length === 0) {
    return { error: "Bruker ikke funnet eller ikke tilknyttet tenant" };
  }

  return { user, tenantId: tenantContext.tenantId };
}

export async function updateNotificationSettings(data: {
  notifyByEmail: boolean;
  notifyBySms: boolean;
  reminderDaysBefore: number;
  notifyMeetings: boolean;
  notifyInspections: boolean;
  notifyAudits: boolean;
  notifyMeasures: boolean;
  constructionDailyCheckAlertsEnabled?: boolean;
  constructionDailyCheckAlertRole?: Role;
}) {
  try {
    const context = await getSessionContext();
    if ("error" in context) {
      return { success: false, error: context.error };
    }

    const { user, tenantId } = context;

    // Valider at reminderDaysBefore er et gyldig tall
    if (data.reminderDaysBefore < 0 || data.reminderDaysBefore > 30) {
      return {
        success: false,
        error: "Påminnelsestid må være mellom 0 og 30 dager",
      };
    }

    // Hent UserTenant for å sjekke telefonnummer
    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
    });

    // Hvis SMS er aktivert, sjekk at bruker har telefonnummer (sjekk både UserTenant og User)
    if (data.notifyBySms && !userTenant?.phone && !user.phone) {
      return {
        success: false,
        error: "Du må legge til telefonnummer før du kan aktivere SMS-varsler",
      };
    }

    // Oppdater innstillinger på UserTenant (tenant-spesifikk)
    await prisma.userTenant.update({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId,
        },
      },
      data: {
        notifyByEmail: data.notifyByEmail,
        notifyBySms: data.notifyBySms,
        reminderDaysBefore: data.reminderDaysBefore,
        notifyMeetings: data.notifyMeetings,
        notifyInspections: data.notifyInspections,
        notifyAudits: data.notifyAudits,
        notifyMeasures: data.notifyMeasures,
      },
    });

    const membership = user.tenants.find((tenant) => tenant.tenantId === tenantId);
    if (
      membership?.role === "ADMIN" &&
      data.constructionDailyCheckAlertsEnabled !== undefined &&
      data.constructionDailyCheckAlertRole
    ) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          constructionDailyCheckAlertsEnabled: data.constructionDailyCheckAlertsEnabled,
          constructionDailyCheckAlertRole: data.constructionDailyCheckAlertRole,
        },
      });
    }

    revalidatePath("/dashboard/settings");
    
    return { success: true };
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return {
      success: false,
      error: "Kunne ikke oppdatere varslingsinnstillinger",
    };
  }
}

