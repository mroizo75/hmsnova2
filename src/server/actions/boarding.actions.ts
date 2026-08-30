"use server";

/**
 * Server actions for onboarding/offboarding
 *
 * Hjemmel:
 *   AML § 14-5/14-6: arbeidsavtale innen 7 dager
 *   AML § 3-5: HMS-opplæring
 *   AML § 2A-6: varslingsrutiner
 *   AML § 15-15: sluttattest
 *   GDPR art. 17: rett til sletting
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { createNotification } from "@/server/actions/notification.actions";
import { addDays } from "date-fns";
import {
  CreateBoardingSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  CompleteTaskSchema,
  SkipTaskSchema,
  type CreateBoardingInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type CompleteTaskInput,
  type SkipTaskInput,
} from "@/features/boarding/schemas/boarding.schema";

// ─── Opprett boarding (fra mal) ─────────────────────────────────────────────

export async function createBoarding(input: CreateBoardingInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateBoarding) {
      throw new Error("Du har ikke tilgang til å opprette onboarding/offboarding");
    }

    const validated = CreateBoardingSchema.parse(input);

    const employee = await prisma.userTenant.findFirst({
      where: { userId: validated.employeeId, tenantId: auth.tenantId },
    });
    if (!employee) throw new Error("Ansatt ikke funnet i denne bedriften");

    const startDate = new Date(validated.startDate);

    let templateTasks: any[] = [];
    if (validated.templateId) {
      const template = await prisma.boardingTemplate.findFirst({
        where: { id: validated.templateId, tenantId: auth.tenantId },
        include: { tasks: { orderBy: { sortOrder: "asc" } } },
      });
      if (template) {
        templateTasks = template.tasks;
      }
    }

    const maxDaysOffset = templateTasks.length > 0
      ? Math.max(...templateTasks.map((t) => t.daysOffset))
      : 30;

    const boarding = await prisma.boarding.create({
      data: {
        tenantId: auth.tenantId,
        employeeId: validated.employeeId,
        type: validated.type,
        status: "IN_PROGRESS",
        templateId: validated.templateId ?? null,
        startDate,
        dueDate: addDays(startDate, maxDaysOffset),
        notes: validated.notes ?? null,
        tasks: {
          create: templateTasks.map((t) => ({
            title: t.title,
            description: t.description,
            assigneeRole: t.assigneeRole,
            dueDate: addDays(startDate, t.daysOffset),
            sortOrder: t.sortOrder,
            category: t.category,
            isRequired: t.isRequired,
            legalRef: t.legalRef,
          })),
        },
      },
      include: {
        employee: { select: { id: true, name: true } },
        tasks: true,
      },
    });

    // Varsle ansatt
    await createNotification({
      tenantId: auth.tenantId,
      userId: validated.employeeId,
      type: "BOARDING_TASK_ASSIGNED",
      title: validated.type === "ONBOARDING" ? "Velkommen! Onboarding startet" : "Offboarding startet",
      message: `Din ${validated.type === "ONBOARDING" ? "onboarding" : "offboarding"}-prosess er opprettet med ${boarding.tasks.length} oppgaver.`,
      link: "/ansatt/onboarding",
    });

    revalidatePath("/dashboard/onboarding");
    triggerRealtimeEvent(auth.tenantId, "boarding-updated");
    return { success: true as const, data: JSON.parse(JSON.stringify(boarding)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette prosess" };
  }
}

// ─── Fullfør oppgave ────────────────────────────────────────────────────────

export async function completeBoardingTask(input: CompleteTaskInput) {
  try {
    const auth = await getAuthContext();
    const validated = CompleteTaskSchema.parse(input);

    const task = await prisma.boardingTask.findFirst({
      where: { id: validated.id },
      include: { boarding: { select: { tenantId: true, id: true, employeeId: true } } },
    });
    if (!task) throw new Error("Oppgave ikke funnet");
    if (task.boarding.tenantId !== auth.tenantId) throw new Error("Ingen tilgang");

    const canComplete =
      auth.permissions.canCreateBoarding ||
      task.assigneeId === auth.userId ||
      task.boarding.employeeId === auth.userId;
    if (!canComplete) throw new Error("Du har ikke tilgang til å fullføre denne oppgaven");

    if (task.status !== "PENDING") throw new Error("Oppgaven er allerede behandlet");

    await prisma.boardingTask.update({
      where: { id: validated.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: auth.userId,
        notes: validated.notes ?? null,
      },
    });

    await checkAndCompleteBoardingIfDone(task.boardingId, auth.tenantId);

    revalidatePath(`/dashboard/onboarding/${task.boardingId}`);
    revalidatePath("/ansatt/onboarding");
    triggerRealtimeEvent(auth.tenantId, "boarding-updated");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke fullføre oppgave" };
  }
}

// ─── Hopp over oppgave ──────────────────────────────────────────────────────

export async function skipBoardingTask(input: SkipTaskInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateBoarding) {
      throw new Error("Du har ikke tilgang til å hoppe over oppgaver");
    }

    const validated = SkipTaskSchema.parse(input);

    const task = await prisma.boardingTask.findFirst({
      where: { id: validated.id },
      include: { boarding: { select: { tenantId: true, id: true } } },
    });
    if (!task) throw new Error("Oppgave ikke funnet");
    if (task.boarding.tenantId !== auth.tenantId) throw new Error("Ingen tilgang");
    if (task.status !== "PENDING") throw new Error("Oppgaven er allerede behandlet");

    await prisma.boardingTask.update({
      where: { id: validated.id },
      data: {
        status: "SKIPPED",
        completedAt: new Date(),
        completedById: auth.userId,
        notes: validated.notes ?? null,
      },
    });

    await checkAndCompleteBoardingIfDone(task.boardingId, auth.tenantId);

    revalidatePath(`/dashboard/onboarding/${task.boardingId}`);
    triggerRealtimeEvent(auth.tenantId, "boarding-updated");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke hoppe over oppgave" };
  }
}

// ─── Auto-fullfør boarding når alle oppgaver er ferdig ──────────────────────

async function checkAndCompleteBoardingIfDone(boardingId: string, tenantId: string) {
  const remaining = await prisma.boardingTask.count({
    where: { boardingId, status: "PENDING", isRequired: true },
  });

  if (remaining === 0) {
    const boarding = await prisma.boarding.update({
      where: { id: boardingId },
      data: { status: "COMPLETED", completedAt: new Date() },
      include: { employee: { select: { name: true } } },
    });

    // Varsle HMS om ferdig boarding
    const hmsUsers = await prisma.userTenant.findMany({
      where: { tenantId, role: { in: ["ADMIN", "HMS"] } },
      select: { userId: true },
    });

    for (const hu of hmsUsers) {
      await createNotification({
        tenantId,
        userId: hu.userId,
        type: "BOARDING_COMPLETED",
        title: `${boarding.type === "ONBOARDING" ? "Onboarding" : "Offboarding"} fullført`,
        message: `Alle påkrevde oppgaver er fullført for ${boarding.employee.name ?? "ansatt"}.`,
        link: `/dashboard/onboarding/${boardingId}`,
      });
    }
  }
}

// ─── Mal-administrasjon ─────────────────────────────────────────────────────

export async function createTemplate(input: CreateTemplateInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canManageBoardingTemplates) {
      throw new Error("Du har ikke tilgang til å administrere maler");
    }

    const validated = CreateTemplateSchema.parse(input);

    const template = await prisma.boardingTemplate.create({
      data: {
        tenantId: auth.tenantId,
        name: validated.name,
        type: validated.type,
        description: validated.description ?? null,
        tasks: {
          create: validated.tasks.map((t, i) => ({
            title: t.title,
            description: t.description ?? null,
            assigneeRole: t.assigneeRole,
            daysOffset: t.daysOffset,
            sortOrder: t.sortOrder ?? i,
            category: t.category ?? null,
            isRequired: t.isRequired ?? true,
            legalRef: t.legalRef ?? null,
          })),
        },
      },
      include: { tasks: true },
    });

    revalidatePath("/dashboard/onboarding/maler");
    return { success: true as const, data: JSON.parse(JSON.stringify(template)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette mal" };
  }
}

export async function updateTemplate(input: UpdateTemplateInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canManageBoardingTemplates) {
      throw new Error("Du har ikke tilgang til å redigere maler");
    }

    const validated = UpdateTemplateSchema.parse(input);

    const existing = await prisma.boardingTemplate.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!existing) throw new Error("Mal ikke funnet");

    if (validated.tasks) {
      await prisma.boardingTemplateTask.deleteMany({
        where: { templateId: validated.id },
      });
    }

    const template = await prisma.boardingTemplate.update({
      where: { id: validated.id },
      data: {
        name: validated.name ?? existing.name,
        description: validated.description ?? existing.description,
        ...(validated.tasks
          ? {
              tasks: {
                create: validated.tasks.map((t, i) => ({
                  title: t.title,
                  description: t.description ?? null,
                  assigneeRole: t.assigneeRole,
                  daysOffset: t.daysOffset,
                  sortOrder: t.sortOrder ?? i,
                  category: t.category ?? null,
                  isRequired: t.isRequired ?? true,
                  legalRef: t.legalRef ?? null,
                })),
              },
            }
          : {}),
      },
      include: { tasks: true },
    });

    revalidatePath("/dashboard/onboarding/maler");
    return { success: true as const, data: JSON.parse(JSON.stringify(template)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke oppdatere mal" };
  }
}

export async function deleteTemplate(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canManageBoardingTemplates) {
      throw new Error("Du har ikke tilgang til å slette maler");
    }

    const template = await prisma.boardingTemplate.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!template) throw new Error("Mal ikke funnet");

    await prisma.boardingTemplate.delete({ where: { id } });

    revalidatePath("/dashboard/onboarding/maler");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke slette mal" };
  }
}

// ─── Kanseller boarding ─────────────────────────────────────────────────────

export async function cancelBoarding(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateBoarding) {
      throw new Error("Du har ikke tilgang til å kansellere prosesser");
    }

    const boarding = await prisma.boarding.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!boarding) throw new Error("Prosess ikke funnet");
    if (boarding.status === "COMPLETED" || boarding.status === "CANCELLED") {
      throw new Error("Prosessen kan ikke kanselleres");
    }

    await prisma.boarding.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/dashboard/onboarding");
    triggerRealtimeEvent(auth.tenantId, "boarding-updated");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke kansellere prosess" };
  }
}

// ─── Generer standardmaler ──────────────────────────────────────────────────

export async function ensureDefaultTemplates() {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canManageBoardingTemplates) {
      throw new Error("Ingen tilgang");
    }

    const existing = await prisma.boardingTemplate.count({
      where: { tenantId: auth.tenantId },
    });
    if (existing > 0) {
      return { success: true as const, message: "Maler finnes allerede" };
    }

    // Onboarding-mal
    await prisma.boardingTemplate.create({
      data: {
        tenantId: auth.tenantId,
        name: "Standard onboarding",
        type: "ONBOARDING",
        description: "Lovpålagt og anbefalt sjekkliste for nye ansatte",
        tasks: {
          create: [
            { title: "Forbered arbeidsplass og IT-tilgang", assigneeRole: "IT", daysOffset: -7, sortOrder: 0, category: "IT/Tilgang" },
            { title: "Send velkomstpakke/informasjon", assigneeRole: "HR", daysOffset: -3, sortOrder: 1, category: "Sosialt" },
            { title: "Velkomst og omvisning", assigneeRole: "MANAGER", daysOffset: 0, sortOrder: 2, category: "Sosialt" },
            { title: "Utlevere nøkler/adgangskort", assigneeRole: "IT", daysOffset: 0, sortOrder: 3, category: "IT/Tilgang" },
            { title: "Signere arbeidsavtale", assigneeRole: "EMPLOYEE", daysOffset: 0, sortOrder: 4, category: "Dokumenter", legalRef: "AML § 14-5" },
            { title: "HMS-opplæring grunnkurs", assigneeRole: "EMPLOYEE", daysOffset: 1, sortOrder: 5, category: "HMS", legalRef: "AML § 3-5" },
            { title: "Gjennomgå varslingsrutiner", assigneeRole: "MANAGER", daysOffset: 1, sortOrder: 6, category: "HMS", legalRef: "AML § 2A-6" },
            { title: "Gjennomgå personalhåndbok", assigneeRole: "EMPLOYEE", daysOffset: 1, sortOrder: 7, category: "Dokumenter" },
            { title: "Introduksjon til team og samarbeidspartnere", assigneeRole: "MANAGER", daysOffset: 3, sortOrder: 8, category: "Sosialt" },
            { title: "Bekreft arbeidsavtale signert", assigneeRole: "HR", daysOffset: 7, sortOrder: 9, category: "Dokumenter", legalRef: "AML § 14-5" },
            { title: "Oppfølgingssamtale 2 uker", assigneeRole: "MANAGER", daysOffset: 14, sortOrder: 10, category: "Sosialt" },
            { title: "Oppfølgingssamtale 1 måned", assigneeRole: "MANAGER", daysOffset: 30, sortOrder: 11, category: "Sosialt" },
            { title: "Oppfølgingssamtale 2 måneder", assigneeRole: "MANAGER", daysOffset: 60, sortOrder: 12, category: "Sosialt" },
            { title: "Evaluering prøvetid", assigneeRole: "MANAGER", daysOffset: 90, sortOrder: 13, category: "Dokumenter" },
            { title: "Halvårsevaluering", assigneeRole: "MANAGER", daysOffset: 180, sortOrder: 14, category: "Sosialt", isRequired: false },
          ],
        },
      },
    });

    // Offboarding-mal
    await prisma.boardingTemplate.create({
      data: {
        tenantId: auth.tenantId,
        name: "Standard offboarding",
        type: "OFFBOARDING",
        description: "Sjekkliste for avslutning av arbeidsforhold",
        tasks: {
          create: [
            { title: "Informere team", assigneeRole: "MANAGER", daysOffset: -14, sortOrder: 0, category: "Sosialt" },
            { title: "Starte kunnskapsoverføring", assigneeRole: "EMPLOYEE", daysOffset: -7, sortOrder: 1, category: "Dokumenter" },
            { title: "Sluttsamtale", assigneeRole: "MANAGER", daysOffset: -3, sortOrder: 2, category: "Sosialt" },
            { title: "Innlevere utstyr", assigneeRole: "EMPLOYEE", daysOffset: -1, sortOrder: 3, category: "Utstyr" },
            { title: "Innlevere nøkler/adgangskort", assigneeRole: "EMPLOYEE", daysOffset: -1, sortOrder: 4, category: "Utstyr" },
            { title: "Stenge IT-tilgang og kontoer", assigneeRole: "IT", daysOffset: 0, sortOrder: 5, category: "IT/Tilgang" },
            { title: "Sluttoppgjør/lønn", assigneeRole: "HR", daysOffset: 0, sortOrder: 6, category: "Dokumenter" },
            { title: "Utstede sluttattest", assigneeRole: "HR", daysOffset: 0, sortOrder: 7, category: "Dokumenter", legalRef: "AML § 15-15" },
            { title: "GDPR-sletting av persondata", assigneeRole: "HR", daysOffset: 7, sortOrder: 8, category: "Dokumenter", legalRef: "GDPR art. 17" },
            { title: "Kontroller at alle tilganger er fjernet", assigneeRole: "IT", daysOffset: 30, sortOrder: 9, category: "IT/Tilgang" },
          ],
        },
      },
    });

    revalidatePath("/dashboard/onboarding/maler");
    return { success: true as const, message: "Standardmaler opprettet" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette standardmaler" };
  }
}
