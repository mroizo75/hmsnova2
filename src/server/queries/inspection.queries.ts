"use server";

import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchInspections() {
  const auth = await getAuthContext();
  const { tenantId } = auth;

  const inspections = await db.inspection.findMany({
    where: { tenantId },
    include: {
      findings: {
        where: {
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      },
      template: {
        select: {
          id: true,
          industryScope: true,
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return JSON.parse(JSON.stringify(inspections));
}

export async function fetchInspectionDetail(id: string) {
  const auth = await getAuthContext();
  const { tenantId } = auth;

  const inspection = await db.inspection.findUnique({
    where: { id, tenantId },
    include: {
      findings: {
        orderBy: { createdAt: "desc" },
        include: {
          linkedMeasure: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      formTemplate: {
        include: {
          fields: {
            orderBy: { order: "asc" },
          },
        },
      },
      formSubmission: {
        include: {
          fieldValues: true,
        },
      },
    },
  });

  if (!inspection) return null;

  const conductedByUser = await db.user.findUnique({
    where: { id: inspection.conductedBy },
    select: { id: true, name: true, email: true },
  });

  const participantIds = inspection.participants ? JSON.parse(inspection.participants) : [];
  const participants = await db.user.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, name: true, email: true },
  });

  return JSON.parse(JSON.stringify({
    inspection,
    conductedByUser,
    participants,
  }));
}

export async function fetchInspectionMobile(id: string) {
  const auth = await getAuthContext();
  const { tenantId } = auth;

  const inspection = await db.inspection.findFirst({
    where: { id, tenantId },
    include: {
      findings: {
        orderBy: { createdAt: "desc" },
      },
      formTemplate: {
        include: {
          fields: {
            orderBy: { order: "asc" },
          },
        },
      },
      formSubmission: {
        include: {
          fieldValues: true,
        },
      },
    },
  });

  if (!inspection) return null;

  return JSON.parse(JSON.stringify(inspection));
}

export async function fetchInspectionsReport(tenantId: string, startDate: Date, endDate: Date) {
  const inspections = await db.inspection.findMany({
    where: {
      tenantId,
      scheduledDate: { gte: startDate, lte: endDate },
    },
    include: {
      findings: {
        orderBy: { severity: "desc" },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const allUserIds = [
    ...new Set([
      ...inspections.map((i) => i.conductedBy).filter(Boolean),
      ...inspections.flatMap((i) => i.findings.map((f) => f.responsibleId).filter(Boolean)),
    ]),
  ] as string[];

  const users = await db.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, name: true },
  });

  return JSON.parse(JSON.stringify({ inspections, users }));
}
