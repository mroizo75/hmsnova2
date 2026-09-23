"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { industryHasEquipmentApproval } from "@/lib/equipment-approval";
import type { EquipmentCategory, EquipmentOperationalStatus } from "@/lib/equipment-approval";

export type EquipmentListItem = {
  id: string;
  name: string;
  category: EquipmentCategory;
  supplierName: string;
  approvalBody: string;
  serialNumber: string | null;
  location: string | null;
  validFrom: string;
  validTo: string;
  operationalStatus: EquipmentOperationalStatus;
  documentCount: number;
  incidentCount: number;
};

export type EquipmentDetail = EquipmentListItem & {
  certificateNumber: string | null;
  notes: string | null;
  documents: Array<{ id: string; name: string; fileKey: string; mime: string; createdAt: string }>;
  routines: Array<{ id: string; title: string }>;
  risks: Array<{ id: string; title: string; score: number }>;
  incidents: Array<{ id: string; title: string; avviksnummer: string | null; status: string }>;
  routineOptions: Array<{ id: string; title: string }>;
  riskOptions: Array<{ id: string; title: string; score: number }>;
};

export async function getEquipmentApprovalContext(): Promise<{
  tenantId: string;
  canEdit: boolean;
} | null> {
  const context = await getAuthContext();
  if (!context) return null;
  if (!context.permissions.canReadInspections) return null;
  const tenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    select: { industry: true },
  });
  if (!industryHasEquipmentApproval(tenant?.industry)) return null;
  return {
    tenantId: context.tenantId,
    canEdit: context.permissions.canCreateInspections,
  };
}

export async function listEquipmentApprovals(): Promise<EquipmentListItem[] | null> {
  const access = await getEquipmentApprovalContext();
  if (!access) return null;
  const rows = await prisma.equipmentApproval.findMany({
    where: { tenantId: access.tenantId },
    orderBy: [{ validTo: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { documents: true, incidents: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    supplierName: row.supplierName,
    approvalBody: row.approvalBody,
    serialNumber: row.serialNumber,
    location: row.location,
    validFrom: row.validFrom.toISOString(),
    validTo: row.validTo.toISOString(),
    operationalStatus: row.operationalStatus,
    documentCount: row._count.documents,
    incidentCount: row._count.incidents,
  }));
}

export async function getEquipmentApproval(id: string): Promise<EquipmentDetail | null> {
  const access = await getEquipmentApprovalContext();
  if (!access) return null;
  const row = await prisma.equipmentApproval.findFirst({
    where: { id, tenantId: access.tenantId },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      routines: {
        include: { routine: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
      },
      risks: {
        include: { risk: { select: { id: true, title: true, score: true } } },
        orderBy: { createdAt: "desc" },
      },
      incidents: {
        select: { id: true, title: true, avviksnummer: true, status: true },
        orderBy: { occurredAt: "desc" },
      },
      _count: { select: { documents: true, incidents: true } },
    },
  });
  if (!row) return null;

  const [routines, risks] = await Promise.all([
    prisma.routine.findMany({
      where: { tenantId: access.tenantId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.risk.findMany({
      where: { tenantId: access.tenantId, status: { not: "CLOSED" } },
      select: { id: true, title: true, score: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const linkedRoutineIds = new Set(row.routines.map((link) => link.routineId));
  const linkedRiskIds = new Set(row.risks.map((link) => link.riskId));

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supplierName: row.supplierName,
    approvalBody: row.approvalBody,
    certificateNumber: row.certificateNumber,
    serialNumber: row.serialNumber,
    location: row.location,
    notes: row.notes,
    validFrom: row.validFrom.toISOString(),
    validTo: row.validTo.toISOString(),
    operationalStatus: row.operationalStatus,
    documentCount: row._count.documents,
    incidentCount: row._count.incidents,
    documents: row.documents.map((document) => ({
      id: document.id,
      name: document.name,
      fileKey: document.fileKey,
      mime: document.mime,
      createdAt: document.createdAt.toISOString(),
    })),
    routines: row.routines.map((link) => link.routine),
    risks: row.risks.map((link) => link.risk),
    incidents: row.incidents,
    routineOptions: routines.filter((routine) => !linkedRoutineIds.has(routine.id)),
    riskOptions: risks.filter((risk) => !linkedRiskIds.has(risk.id)),
  };
}

export async function listEquipmentChoices(tenantId: string, industry: string | null | undefined) {
  if (!industryHasEquipmentApproval(industry)) return [];
  return prisma.equipmentApproval.findMany({
    where: { tenantId },
    select: { id: true, name: true, serialNumber: true },
    orderBy: { name: "asc" },
  });
}
