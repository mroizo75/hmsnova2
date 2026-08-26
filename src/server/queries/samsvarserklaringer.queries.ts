"use server";

import { getCurrentUser } from "@/lib/server-action";
import { getPermissions } from "@/lib/permissions";
import { getElectroForDashboard } from "@/server/actions/electro.actions";

export async function fetchSamsvarserklaringer() {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = user.tenants.at(0);
  if (!membership) return null;

  const permissions = getPermissions(membership.role);
  if (!permissions.canReadDocuments) return null;

  const result = await getElectroForDashboard();
  if (result.success === false) return null;

  const compliance = result.data.compliance.map((c: any) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    originalFileName: c.originalFileName,
    fileKey: c.fileKey,
    mime: c.mime,
    contractorName: c.contractorName,
    workCompletedAt: c.workCompletedAt ? c.workCompletedAt.toISOString() : null,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    createdById: c.createdById,
  }));

  return JSON.parse(JSON.stringify({
    compliance,
    currentUserId: user.id,
    canCreate: permissions.canCreateDocuments,
    canDeleteAny: permissions.canDeleteDocuments,
  }));
}
