"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTenantContextSafe } from "@/lib/tenant-context";
import { canStartWellbeingRound } from "@/lib/wellbeing/round";

const emptyWellbeing = {
  wellbeingForms: [],
  allSubmissions: [],
  wellbeingRisks: [],
  totalSubmissions: 0,
  submissionsThisMonth: 0,
  averageScore: null,
  criticalIncidents: 0,
  canStart: false,
  employees: [] as { userId: string; name: string }[],
  assignments: [] as Array<{
    id: string;
    status: "PENDING" | "ANSWERED";
    round: {
      id: string;
      title: string;
      message: string | null;
      dueDate: string | null;
      formTemplateId: string;
      formTitle: string;
    };
  }>,
  rounds: [] as Array<{
    id: string;
    title: string;
    status: "ACTIVE" | "CLOSED";
    dueDate: string | null;
    answered: number;
    total: number;
    pendingNames: string[];
  }>,
};

export async function fetchWellbeingData() {
  const ctx = await getTenantContextSafe();
  if (!ctx) return emptyWellbeing;
  const { tenantId } = ctx;

  const wellbeingForms = await prisma.formTemplate.findMany({
    where: {
      OR: [
        { tenantId, category: "WELLBEING" },
        { isGlobal: true, category: "WELLBEING" },
      ],
      isActive: true,
    },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          submissions: {
            where: { tenantId },
          },
        },
      },
      submissions: {
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const allSubmissions = await prisma.formSubmission.findMany({
    where: {
      tenantId,
      formTemplate: {
        category: "WELLBEING",
      },
    },
    include: {
      fieldValues: {
        include: {
          field: true,
        },
      },
      formTemplate: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const wellbeingRisks = await prisma.risk.findMany({
    where: {
      tenantId,
      category: "HEALTH",
      title: {
        contains: "psykososial",
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalSubmissions = allSubmissions.length;
  const submissionsThisMonth = allSubmissions.filter((s) => {
    const date = new Date(s.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const likertValues = allSubmissions.flatMap((s) =>
    s.fieldValues
      .filter((fv) => fv.field.fieldType === "LIKERT_SCALE")
      .map((fv) => parseInt(fv.value || "0"))
      .filter((v) => v > 0),
  );

  const averageScore =
    likertValues.length > 0
      ? (likertValues.reduce((sum, val) => sum + val, 0) / likertValues.length).toFixed(1)
      : null;

  const criticalIncidents = allSubmissions.filter((s) =>
    s.fieldValues.some(
      (fv) => fv.field.fieldType === "RADIO" && fv.value === "Ofte",
    ),
  ).length;

  const session = await getServerSession(authOptions);
  const canStart = canStartWellbeingRound(session?.user?.role ?? "");

  const [assignmentRows, roundRows, employeeRows] = await Promise.all([
    prisma.wellbeingRoundRecipient.findMany({
      where: { userId: ctx.userId, round: { tenantId, status: "ACTIVE" } },
      include: {
        round: {
          select: {
            id: true,
            title: true,
            message: true,
            dueDate: true,
            formTemplateId: true,
            formTemplate: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    canStart
      ? prisma.wellbeingRound.findMany({
          where: { tenantId },
          include: {
            recipients: {
              select: { status: true, user: { select: { name: true, email: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canStart
      ? prisma.userTenant.findMany({
          where: { tenantId },
          select: { userId: true, user: { select: { name: true, email: true } } },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
  ]);

  return JSON.parse(JSON.stringify({
    wellbeingForms,
    allSubmissions,
    wellbeingRisks,
    totalSubmissions,
    submissionsThisMonth,
    averageScore,
    criticalIncidents,
    canStart,
    employees: employeeRows.map((row) => ({
      userId: row.userId,
      name: row.user.name || row.user.email,
    })),
    assignments: assignmentRows.map((row) => ({
      id: row.id,
      status: row.status,
      round: {
        id: row.round.id,
        title: row.round.title,
        message: row.round.message,
        dueDate: row.round.dueDate ? row.round.dueDate.toISOString() : null,
        formTemplateId: row.round.formTemplateId,
        formTitle: row.round.formTemplate.title,
      },
    })),
    rounds: roundRows.map((round) => {
      const answered = round.recipients.filter((recipient) => recipient.status === "ANSWERED").length;
      const pending = round.recipients.filter((recipient) => recipient.status === "PENDING");
      return {
        id: round.id,
        title: round.title,
        status: round.status,
        dueDate: round.dueDate ? round.dueDate.toISOString() : null,
        answered,
        total: round.recipients.length,
        pendingNames: pending.slice(0, 12).map((recipient) => recipient.user.name || recipient.user.email),
      };
    }),
  }));
}
