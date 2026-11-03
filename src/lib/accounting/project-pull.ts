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

type ExistingProjectRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  clientName: string | null;
  location: string | null;
  orderNumber: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: ProjectStatus;
  billingStatus: BillingStatus;
  externalProjectId: string | null;
  externalCustomerId: string | null;
  contactExternalId: string | null;
  parentId: string | null;
};

type PulledProjectData = Omit<ExistingProjectRow, "id">;

function sameDate(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return a === b;
  return a.getTime() === b.getTime();
}

/** True når noe i Tripletex-dataene avviker fra det som ligger i NOVA (unngår unødvendige skriv). */
export function pulledProjectChanged(existing: PulledProjectData, next: PulledProjectData): boolean {
  return (
    existing.name !== next.name ||
    existing.code !== next.code ||
    existing.description !== next.description ||
    existing.clientName !== next.clientName ||
    existing.location !== next.location ||
    existing.orderNumber !== next.orderNumber ||
    !sameDate(existing.startDate, next.startDate) ||
    !sameDate(existing.endDate, next.endDate) ||
    existing.status !== next.status ||
    existing.billingStatus !== next.billingStatus ||
    existing.externalProjectId !== next.externalProjectId ||
    existing.externalCustomerId !== next.externalCustomerId ||
    existing.contactExternalId !== next.contactExternalId ||
    existing.parentId !== next.parentId
  );
}

const EXISTING_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  clientName: true,
  location: true,
  orderNumber: true,
  startDate: true,
  endDate: true,
  status: true,
  billingStatus: true,
  externalProjectId: true,
  externalCustomerId: true,
  contactExternalId: true,
  parentId: true,
} as const;

export async function upsertPulledProjects(
  tenantId: string,
  projects: AccountingProjectDto[]
): Promise<{ created: number; updated: number }> {
  const rows = sortProjectsParentsFirst(projects.filter((p) => !p.isOffer));
  if (rows.length === 0) return { created: 0, updated: 0 };

  // Én spørring for alle eksisterende prosjekter i stedet for 2–3 per Tripletex-rad.
  const existingRows: ExistingProjectRow[] = await prisma.project.findMany({
    where: { tenantId },
    select: EXISTING_SELECT,
  });
  const byExternalId = new Map<string, ExistingProjectRow>();
  const unlinkedByCode = new Map<string, ExistingProjectRow>();
  for (const p of existingRows) {
    if (p.externalProjectId) byExternalId.set(p.externalProjectId, p);
    else if (p.code && !unlinkedByCode.has(p.code)) unlinkedByCode.set(p.code, p);
  }

  let actorUserId: string | null = null;
  async function getActorUserId(): Promise<string | null> {
    if (actorUserId) return actorUserId;
    const actor =
      (await prisma.userTenant.findFirst({
        where: { tenantId, role: "ADMIN" },
        select: { userId: true },
      })) ??
      (await prisma.userTenant.findFirst({
        where: { tenantId },
        select: { userId: true },
      }));
    actorUserId = actor?.userId ?? null;
    return actorUserId;
  }

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing =
      byExternalId.get(row.externalId) ??
      (row.number ? unlinkedByCode.get(row.number) : undefined) ??
      null;

    const parentId = row.parentExternalId
      ? byExternalId.get(row.parentExternalId)?.id ?? existing?.parentId ?? null
      : existing?.parentId ?? null;

    const pulledStatus = statusFromAccountingProject(row.isClosed);
    const data: PulledProjectData = {
      name: row.name,
      code: row.number || existing?.code || null,
      description: row.description || existing?.description || null,
      clientName: row.customerName || existing?.clientName || null,
      location: row.location || existing?.location || null,
      orderNumber: row.reference || existing?.orderNumber || null,
      startDate: parseIsoDate(row.startDate) ?? existing?.startDate ?? null,
      endDate: parseIsoDate(row.endDate) ?? existing?.endDate ?? null,
      status:
        existing && (existing.status === "ARCHIVED" || existing.status === "ON_HOLD")
          ? existing.status
          : pulledStatus,
      billingStatus:
        existing?.billingStatus === "INVOICED"
          ? "INVOICED"
          : billingFromAccountingProject(row),
      externalProjectId: row.externalId,
      externalCustomerId: row.customerExternalId || existing?.externalCustomerId || null,
      contactExternalId: row.contactExternalId || existing?.contactExternalId || null,
      parentId,
    };

    if (existing) {
      if (pulledProjectChanged(existing, data)) {
        await prisma.project.update({ where: { id: existing.id }, data });
        updated += 1;
      }
      const merged = { ...existing, ...data };
      byExternalId.set(row.externalId, merged);
      if (existing.code) unlinkedByCode.delete(existing.code);
    } else {
      const userId = await getActorUserId();
      if (!userId) continue;
      const createdRow = await prisma.project.create({
        data: { ...data, tenantId, createdById: userId },
        select: EXISTING_SELECT,
      });
      byExternalId.set(row.externalId, createdRow);
      created += 1;
    }
  }

  return { created, updated };
}
