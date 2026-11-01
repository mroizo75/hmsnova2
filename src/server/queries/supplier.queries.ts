import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import { supplierPerformance } from "@/lib/supplier-management";

export async function listSuppliers() {
  const context = await requirePermission("canReadAudits");
  const rows = await prisma.supplier.findMany({
    where: { tenantId: context.tenantId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { audits: true, incidents: true } },
      incidents: { where: { status: { not: "CLOSED" } }, select: { id: true } },
    },
  });

  return rows.map((row) => {
    const performance = supplierPerformance({
      openDeviations: row.incidents.length,
      hasEvaluation: row.status === "APPROVED" || row.status === "CONDITIONAL" || row._count.audits > 0,
    });
    return {
      id: row.id,
      name: row.name,
      orgNumber: row.orgNumber,
      status: row.status,
      criticality: row.criticality,
      nextReviewAt: row.nextReviewAt,
      auditCount: row._count.audits,
      openDeviations: row.incidents.length,
      performance,
    };
  });
}

export async function getSupplier(id: string) {
  const context = await requirePermission("canReadAudits");
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: context.tenantId },
    include: {
      approvedBy: { select: { id: true, name: true, email: true } },
      audits: {
        orderBy: { scheduledDate: "desc" },
        select: { id: true, title: true, status: true, scheduledDate: true, auditType: true },
      },
      incidents: {
        orderBy: { occurredAt: "desc" },
        select: { id: true, title: true, status: true, occurredAt: true, type: true },
      },
    },
  });
  if (!supplier) return null;

  const openDeviations = supplier.incidents.filter((incident) => incident.status !== "CLOSED").length;
  return {
    ...supplier,
    performance: supplierPerformance({
      openDeviations,
      hasEvaluation:
        supplier.status === "APPROVED" ||
        supplier.status === "CONDITIONAL" ||
        supplier.audits.length > 0,
    }),
    openDeviations,
  };
}

export async function listSupplierLinkOptions(supplierId: string) {
  const context = await requirePermission("canReadAudits");
  const [audits, incidents] = await Promise.all([
    prisma.audit.findMany({
      where: {
        tenantId: context.tenantId,
        auditType: "SUPPLIER",
        OR: [{ supplierId: null }, { supplierId }],
      },
      orderBy: { scheduledDate: "desc" },
      take: 40,
      select: { id: true, title: true, supplierId: true },
    }),
    prisma.incident.findMany({
      where: {
        tenantId: context.tenantId,
        type: "KVALITET",
        OR: [{ supplierId: null }, { supplierId }],
      },
      orderBy: { occurredAt: "desc" },
      take: 40,
      select: { id: true, title: true, supplierId: true, subcategoryKeys: true },
    }),
  ]);

  return {
    audits: audits.filter((audit) => audit.supplierId !== supplierId),
    incidents: incidents.filter((incident) => incident.supplierId !== supplierId),
  };
}
