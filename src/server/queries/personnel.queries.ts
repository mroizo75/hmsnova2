"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { canAccessPersonnelFile } from "@/features/personnel/lib/personnel-categories";

export type PersonnelEmployeeRow = {
  userId: string;
  name: string | null;
  email: string;
  department: string | null;
  position: string | null;
  documentCount: number;
  expiredCount: number;
};

export type PersonnelDocumentRow = {
  id: string;
  category: string;
  title: string;
  fileName: string;
  mime: string;
  fileSize: number;
  legalRef: string | null;
  retainUntil: string | null;
  notes: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null };
};

export type PersonnelFolder = {
  userId: string;
  name: string | null;
  email: string;
  department: string | null;
  position: string | null;
  documents: PersonnelDocumentRow[];
};

function serializeDoc(doc: {
  id: string;
  category: string;
  title: string;
  fileName: string;
  mime: string;
  fileSize: number;
  legalRef: string | null;
  retainUntil: Date | null;
  notes: string | null;
  createdAt: Date;
  uploadedBy: { id: string; name: string | null };
}): PersonnelDocumentRow {
  return {
    id: doc.id,
    category: doc.category,
    title: doc.title,
    fileName: doc.fileName,
    mime: doc.mime,
    fileSize: doc.fileSize,
    legalRef: doc.legalRef,
    retainUntil: doc.retainUntil ? doc.retainUntil.toISOString() : null,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    uploadedBy: doc.uploadedBy,
  };
}

export async function fetchPersonnelEmployees(): Promise<PersonnelEmployeeRow[]> {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadAllPersonnelFiles) return [];

  const memberships = await prisma.userTenant.findMany({
    where: { tenantId: auth.tenantId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.personnelDocument.groupBy({
    by: ["userId"],
    where: { tenantId: auth.tenantId },
    _count: { id: true },
  });

  const expired = await prisma.personnelDocument.groupBy({
    by: ["userId"],
    where: { tenantId: auth.tenantId, retainUntil: { lt: new Date() } },
    _count: { id: true },
  });

  const countMap = new Map(counts.map((c) => [c.userId, c._count.id]));
  const expiredMap = new Map(expired.map((c) => [c.userId, c._count.id]));

  return memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    department: m.department,
    position: m.position,
    documentCount: countMap.get(m.user.id) ?? 0,
    expiredCount: expiredMap.get(m.user.id) ?? 0,
  }));
}

export async function fetchPersonnelFolder(userId: string): Promise<PersonnelFolder | null> {
  const auth = await getAuthContext();
  if (!auth) return null;

  const allowed = canAccessPersonnelFile({
    viewerId: auth.userId,
    employeeId: userId,
    canReadOwn: auth.permissions.canReadOwnPersonnelFile,
    canReadAll: auth.permissions.canReadAllPersonnelFiles,
  });
  if (!allowed) return null;

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!membership) return null;

  const documents = await prisma.personnelDocument.findMany({
    where: { tenantId: auth.tenantId, userId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  return {
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    department: membership.department,
    position: membership.position,
    documents: documents.map(serializeDoc),
  };
}

export async function fetchMyPersonnelFolder(): Promise<PersonnelFolder | null> {
  const auth = await getAuthContext();
  if (!auth) return null;
  return fetchPersonnelFolder(auth.userId);
}
