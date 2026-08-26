"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { getHandbookData, getHandbookSuggestions, getVersionHistory } from "@/server/actions/hms-handbok.actions";

export async function fetchHmsHandbok() {
  const auth = await getAuthContext();
  if (!auth) return null;

  const { permissions, tenantId, userId } = auth;

  if (!permissions.canReadDocuments && !permissions.canReadRoutines) {
    return null;
  }

  const [tenant, handbookResult, suggestions, versionHistory] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        orgNumber: true,
        industry: true,
        hmsContactName: true,
        hmsContactPhone: true,
      },
    }),
    getHandbookData(tenantId),
    getHandbookSuggestions(tenantId),
    getVersionHistory(tenantId),
  ]);

  if (!handbookResult.success) return null;

  const canManage =
    permissions.canUpdateSettings ||
    permissions.canApproveDocuments ||
    permissions.canApproveManagementReviews;

  const canApprove =
    permissions.canUpdateSettings ||
    permissions.canApproveDocuments;

  return JSON.parse(JSON.stringify({
    tenantId,
    tenantName: tenant.name,
    orgNumber: tenant.orgNumber,
    industry: tenant.industry,
    hmsContactName: tenant.hmsContactName,
    hmsContactPhone: tenant.hmsContactPhone,
    handbook: handbookResult.handbook,
    stats: handbookResult.stats,
    currentUserId: userId,
    canManage,
    canApprove,
    isEmployee: auth.role === "ANSATT",
    suggestions,
    versionHistory: canManage ? versionHistory.map((v: any) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      changeNote: v.changeNote,
      rejectedNote: v.rejectedNote,
      approvedAt: v.approvedAt?.toISOString() ?? null,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      approvedBy: v.approvedBy,
      _count: v._count,
    })) : [],
  }));
}
