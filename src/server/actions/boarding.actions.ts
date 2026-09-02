"use server";

/**
 * Server actions for onboarding/offboarding
 *
 * Hjemmel:
 *   AML § 14-5/14-6: arbeidsavtale innen 7 dager
 *   AML § 3-2: opplæring og instruksjon
 *   AML § 2 A-6: varslingsrutiner
 *   AML § 15-15: sluttattest
 *   GDPR art. 13 og art. 17: informasjon og sletting
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
import { getBoardingTemplateLibrary } from "@/lib/boarding-template-library";

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

export async function cancelBoarding(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");
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

export async function ensureDefaultTemplates() {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");
    if (!auth.permissions.canManageBoardingTemplates) {
      throw new Error("Ingen tilgang");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { industry: true },
    });

    const library = getBoardingTemplateLibrary(tenant?.industry ?? null);
    let templatesCreated = 0;
    let tasksAdded = 0;
    let tasksUpdated = 0;

    for (const template of library) {
      const existing =
        (await prisma.boardingTemplate.findFirst({
          where: { tenantId: auth.tenantId, sourceKey: template.sourceKey },
          include: { tasks: true },
        })) ??
        (await prisma.boardingTemplate.findFirst({
          where: { tenantId: auth.tenantId, name: template.name, type: template.type },
          include: { tasks: true },
        }));

      if (!existing) {
        await prisma.boardingTemplate.create({
          data: {
            tenantId: auth.tenantId,
            name: template.name,
            type: template.type,
            description: template.description,
            sourceKey: template.sourceKey,
            tasks: {
              create: template.tasks.map((task, index) => ({
                title: task.title,
                description: task.description,
                assigneeRole: task.assigneeRole,
                daysOffset: task.daysOffset,
                sortOrder: index,
                category: task.category,
                isRequired: task.isRequired,
                legalRef: task.legalRef ?? null,
                sourceKey: task.sourceKey,
              })),
            },
          },
        });
        templatesCreated += 1;
        continue;
      }

      if (!existing.sourceKey) {
        await prisma.boardingTemplate.update({
          where: { id: existing.id },
          data: {
            sourceKey: template.sourceKey,
            description: template.description,
          },
        });
      }

      const existingByKey = new Map(
        existing.tasks.filter((task) => task.sourceKey).map((task) => [task.sourceKey, task])
      );
      const existingByTitle = new Map(existing.tasks.map((task) => [task.title, task]));
      let nextSort = existing.tasks.reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1;

      for (const task of template.tasks) {
        const match = existingByKey.get(task.sourceKey) ?? existingByTitle.get(task.title);
        if (!match) {
          await prisma.boardingTemplateTask.create({
            data: {
              templateId: existing.id,
              title: task.title,
              description: task.description,
              assigneeRole: task.assigneeRole,
              daysOffset: task.daysOffset,
              sortOrder: nextSort,
              category: task.category,
              isRequired: task.isRequired,
              legalRef: task.legalRef ?? null,
              sourceKey: task.sourceKey,
            },
          });
          nextSort += 1;
          tasksAdded += 1;
          continue;
        }

        await prisma.boardingTemplateTask.update({
          where: { id: match.id },
          data: {
            title: task.title,
            description: task.description,
            assigneeRole: task.assigneeRole,
            daysOffset: task.daysOffset,
            category: task.category,
            isRequired: task.isRequired,
            legalRef: task.legalRef ?? null,
            sourceKey: task.sourceKey,
          },
        });
        tasksUpdated += 1;
      }
    }

    revalidatePath("/dashboard/onboarding/maler");
    const message =
      templatesCreated > 0
        ? `Standardmaler opprettet (${templatesCreated})`
        : `Maler oppdatert fra lovkrav (${tasksAdded} nye oppgaver, ${tasksUpdated} oppdatert)`;
    return { success: true as const, message };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette standardmaler" };
  }
}
