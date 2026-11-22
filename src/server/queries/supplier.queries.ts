import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/server-authorization";
import {
  isAssessmentOverdue,
  isDocumentExpired,
  isReviewOverdue,
  standardSupplierQuestions,
  supplierFollowUp,
  supplierPerformance,
} from "@/lib/supplier-management";

function openFindingCount(audits: { findings: { id: string }[] }[]): number {
  return audits.reduce((total, audit) => total + audit.findings.length, 0);
}

export async function listSuppliers() {
  const context = await requirePermission("canReadAudits");
  const now = new Date();
  const rows = await prisma.supplier.findMany({
    where: { tenantId: context.tenantId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { audits: true, evaluations: true } },
      incidents: { where: { status: { not: "CLOSED" } }, select: { id: true } },
      documents: { select: { expiresAt: true } },
      assessments: { where: { status: { in: ["SENT", "ANSWERED"] } }, select: { status: true, dueAt: true } },
      audits: {
        select: { findings: { where: { status: { not: "VERIFIED" } }, select: { id: true } } },
      },
    },
  });

  return rows.map((row) => {
    const expiredDocuments = row.documents.filter((document) => isDocumentExpired(document.expiresAt, now)).length;
    const overdueAssessments = row.assessments.filter((assessment) =>
      isAssessmentOverdue(assessment.dueAt, assessment.status, now),
    ).length;
    const answersToReview = row.assessments.filter((assessment) => assessment.status === "ANSWERED").length;
    const reviewOverdue =
      (row.status === "APPROVED" || row.status === "CONDITIONAL") && isReviewOverdue(row.nextReviewAt, now);
    const openAuditFindings = openFindingCount(row.audits);
    const performance = supplierPerformance({
      openDeviations: row.incidents.length,
      hasEvaluation:
        row.status === "APPROVED" ||
        row.status === "CONDITIONAL" ||
        row._count.evaluations > 0 ||
        row._count.audits > 0,
      reviewOverdue,
      expiredDocuments,
      overdueAssessments,
      openAuditFindings,
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
      followUp: supplierFollowUp({ reviewOverdue, expiredDocuments, overdueAssessments, answersToReview }),
    };
  });
}

export async function getSupplier(id: string) {
  const context = await requirePermission("canReadAudits");
  const now = new Date();
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: context.tenantId },
    include: {
      approvedBy: { select: { id: true, name: true, email: true } },
      audits: {
        orderBy: { scheduledDate: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          scheduledDate: true,
          auditType: true,
          findings: { where: { status: { not: "VERIFIED" } }, select: { id: true } },
        },
      },
      incidents: {
        orderBy: { occurredAt: "desc" },
        select: { id: true, title: true, status: true, occurredAt: true, type: true },
      },
      evaluations: {
        orderBy: { evaluatedAt: "desc" },
        select: {
          id: true,
          method: true,
          outcome: true,
          summary: true,
          actions: true,
          evaluatedAt: true,
          nextReviewAt: true,
          evaluatedBy: { select: { name: true } },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          kind: true,
          reference: true,
          expiresAt: true,
          fileKey: true,
          fileName: true,
          notes: true,
        },
      },
      assessments: {
        orderBy: { sentAt: "desc" },
        select: {
          id: true,
          status: true,
          dueAt: true,
          sentAt: true,
          sentToEmail: true,
          answeredAt: true,
          respondentName: true,
          respondentEmail: true,
          confirmsRequirements: true,
          competence: true,
          ownControls: true,
          subcontracting: true,
          certifications: true,
          recentDeviations: true,
          acceptsMonitoring: true,
          coordinationContact: true,
          hmsSystem: true,
          worksOnSite: true,
          answersSnapshot: true,
          questionsSnapshot: true,
        },
      },
    },
  });
  if (!supplier) return null;

  const savedQuestionCount = await prisma.supplierFormQuestion.count({
    where: { template: { tenantId: context.tenantId } },
  });
  const questionCount = savedQuestionCount || standardSupplierQuestions().length;
  const openDeviations = supplier.incidents.filter((incident) => incident.status !== "CLOSED").length;
  const expiredDocuments = supplier.documents.filter((document) => isDocumentExpired(document.expiresAt, now)).length;
  const overdueAssessments = supplier.assessments.filter((assessment) =>
    isAssessmentOverdue(assessment.dueAt, assessment.status, now),
  ).length;
  const reviewOverdue =
    (supplier.status === "APPROVED" || supplier.status === "CONDITIONAL") &&
    isReviewOverdue(supplier.nextReviewAt, now);
  return {
    ...supplier,
    performance: supplierPerformance({
      openDeviations,
      hasEvaluation:
        supplier.status === "APPROVED" ||
        supplier.status === "CONDITIONAL" ||
        supplier.evaluations.length > 0 ||
        supplier.audits.length > 0,
      reviewOverdue,
      expiredDocuments,
      overdueAssessments,
      openAuditFindings: openFindingCount(supplier.audits),
    }),
    openDeviations,
    reviewOverdue,
    expiredDocuments,
    questionCount,
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
