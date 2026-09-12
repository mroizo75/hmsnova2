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

export type NextOfKinRow = {
  name: string;
  relation: string | null;
  phone: string | null;
};

export type HrProfileRow = {
  nationality: string | null;
  languages: string[];
  hrNotes: string | null;
  startedAt: string | null;
  dateOfBirth: string | null;
  employeeNumber: string | null;
  nextOfKin: NextOfKinRow[];
  canReadHrNotes: boolean;
};

export type PersonnelFolder = {
  userId: string;
  name: string | null;
  email: string;
  department: string | null;
  departmentId: string | null;
  position: string | null;
  documents: PersonnelDocumentRow[];
  hrProfile: HrProfileRow | null;
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

function parseLanguages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function fetchPersonnelEmployees(): Promise<PersonnelEmployeeRow[]> {
  const auth = await getAuthContext();
  if (!auth) return [];

  const canAll = auth.permissions.canReadAllPersonnelFiles;
  const canDept = auth.permissions.canReadDepartmentPersonnelFiles && auth.departmentId;
  if (!canAll && !canDept) return [];

  const memberships = await prisma.userTenant.findMany({
    where: {
      tenantId: auth.tenantId,
      ...(canAll ? {} : { departmentId: auth.departmentId }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      orgDepartment: { select: { name: true } },
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
    department: m.orgDepartment?.name ?? m.department,
    position: m.position,
    documentCount: countMap.get(m.user.id) ?? 0,
    expiredCount: expiredMap.get(m.user.id) ?? 0,
  }));
}

export async function fetchPersonnelFolder(userId: string): Promise<PersonnelFolder | null> {
  const auth = await getAuthContext();
  if (!auth) return null;

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      orgDepartment: { select: { name: true } },
      hrProfile: true,
      nextOfKin: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!membership) return null;

  const allowed = canAccessPersonnelFile({
    viewerId: auth.userId,
    employeeId: userId,
    canReadOwn: auth.permissions.canReadOwnPersonnelFile,
    canReadAll: auth.permissions.canReadAllPersonnelFiles,
    canReadDepartment: auth.permissions.canReadDepartmentPersonnelFiles,
    viewerDepartmentId: auth.departmentId,
    employeeDepartmentId: membership.departmentId,
  });
  if (!allowed) return null;

  const documents = await prisma.personnelDocument.findMany({
    where: { tenantId: auth.tenantId, userId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  const canReadHrNotes = auth.permissions.canReadHrNotes;
  const isSelf = auth.userId === userId;

  return {
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    department: membership.orgDepartment?.name ?? membership.department,
    departmentId: membership.departmentId,
    position: membership.position,
    documents: documents.map(serializeDoc),
    hrProfile: {
      nationality: canReadHrNotes || auth.permissions.canReadAllPersonnelFiles ? membership.hrProfile?.nationality ?? null : null,
      languages:
        canReadHrNotes || auth.permissions.canReadDepartmentPersonnelFiles || isSelf
          ? parseLanguages(membership.hrProfile?.languages)
          : [],
      hrNotes: canReadHrNotes ? membership.hrProfile?.hrNotes ?? null : null,
      startedAt: membership.hrProfile?.startedAt?.toISOString() ?? null,
      dateOfBirth: canReadHrNotes || isSelf ? membership.hrProfile?.dateOfBirth?.toISOString() ?? null : null,
      employeeNumber: membership.employeeNumber,
      nextOfKin:
        canReadHrNotes || isSelf
          ? membership.nextOfKin.map((kin) => ({
              name: kin.name,
              relation: kin.relation,
              phone: kin.phone,
            }))
          : [],
      canReadHrNotes,
    },
  };
}

export async function fetchMyPersonnelFolder(): Promise<PersonnelFolder | null> {
  const auth = await getAuthContext();
  if (!auth) return null;
  return fetchPersonnelFolder(auth.userId);
}
