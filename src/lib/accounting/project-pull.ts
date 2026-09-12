import type { BillingStatus, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AccountingProjectDto } from "./types";

export function sortProjectsParentsFirst(rows: AccountingProjectDto[]): AccountingProjectDto[] {
  const byId = new Map(rows.map((r) => [r.externalId, r]));
  const result: AccountingProjectDto[] = [];
  const seen = new Set<string>();

  function visit(row: AccountingProjectDto) {
    if (seen.has(row.externalId)) return;
    seen.add(row.externalId);
    if (row.parentExternalId) {
      const parent = byId.get(row.parentExternalId);
      if (parent) visit(parent);
    }
    result.push(row);
  }

  for (const row of rows) visit(row);
  return result;
}

export function statusFromAccountingProject(isClosed: boolean): ProjectStatus {
  return isClosed ? "COMPLETED" : "ACTIVE";
}

export function billingFromAccountingProject(input: {
  isReadyForInvoicing: boolean;
}): BillingStatus {
  return input.isReadyForInvoicing ? "READY" : "OPEN";
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function upsertPulledProjects(
  tenantId: string,
  projects: AccountingProjectDto[]
): Promise<{ created: number; updated: number }> {
  const rows = sortProjectsParentsFirst(projects.filter((p) => !p.isOffer));
  if (rows.length === 0) return { created: 0, updated: 0 };

  const actor =
    (await prisma.userTenant.findFirst({
      where: { tenantId, role: "ADMIN" },
      select: { userId: true },
    })) ??
    (await prisma.userTenant.findFirst({
      where: { tenantId },
      select: { userId: true },
    }));
  if (!actor) return { created: 0, updated: 0 };

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing =
      (await prisma.project.findFirst({
        where: { tenantId, externalProjectId: row.externalId },
      })) ??
      (row.number
        ? await prisma.project.findFirst({
            where: { tenantId, code: row.number, externalProjectId: null },
          })
        : null);

    const parent = row.parentExternalId
      ? await prisma.project.findFirst({
          where: { tenantId, externalProjectId: row.parentExternalId },
          select: { id: true },
        })
      : null;

    const data = {
      name: row.name,
      code: row.number || existing?.code || null,
      description: row.description || existing?.description || null,
      clientName: row.customerName || existing?.clientName || null,
      location: row.location || existing?.location || null,
      orderNumber: row.reference || existing?.orderNumber || null,
      startDate: parseIsoDate(row.startDate) ?? existing?.startDate ?? null,
      endDate: parseIsoDate(row.endDate) ?? existing?.endDate ?? null,
      status: statusFromAccountingProject(row.isClosed),
      billingStatus:
        existing?.billingStatus === "INVOICED"
          ? "INVOICED"
          : billingFromAccountingProject(row),
      externalProjectId: row.externalId,
      externalCustomerId: row.customerExternalId || existing?.externalCustomerId || null,
      contactExternalId: row.contactExternalId || existing?.contactExternalId || null,
      parentId: parent?.id ?? existing?.parentId ?? null,
    };

    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: {
          ...data,
          status:
            existing.status === "ARCHIVED" || existing.status === "ON_HOLD"
              ? existing.status
              : data.status,
        },
      });
      updated += 1;
    } else {
      await prisma.project.create({
        data: {
          ...data,
          tenantId,
          createdById: actor.userId,
        },
      });
      created += 1;
    }
  }

  return { created, updated };
}
