"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/server-action";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { distributableDocumentsWhere } from "@/lib/document-module-scope";
import { documentVisibleToRole } from "@/features/documents/lib/read-confirmation";

export async function fetchDocuments() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return null;
  }

  const documents = await prisma.document.findMany({
    where: { tenantId: userTenant.tenantId, ...distributableDocumentsWhere },
    orderBy: { createdAt: "desc" },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      template: {
        select: { id: true, name: true },
      },
    },
  });

  return JSON.parse(JSON.stringify({
    documents,
    tenantId: userTenant.tenantId,
    currentUserId: user.id,
  }));
}

export async function fetchDocumentDetail(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return null;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return null;
  }

  const tenantId = selectedMembership.tenantId;

  const document = await prisma.document.findUnique({
    where: { id, tenantId },
    include: {
      template: true,
      versions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      signatures: {
        include: {
          signedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ role: "asc" }, { signedAt: "asc" }],
      },
      approvedByUser: {
        select: { name: true, email: true },
      },
      owner: {
        select: { name: true, email: true },
      },
    },
  });

  if (!document) {
    return null;
  }

  const [members, confirmations, mine] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId },
      select: { userId: true, role: true },
    }),
    prisma.documentConfirmation.findMany({
      where: { documentId: document.id, documentVersion: document.version },
      select: { userId: true },
    }),
    prisma.documentConfirmation.findUnique({
      where: {
        documentId_userId_documentVersion: {
          documentId: document.id,
          userId: user.id,
          documentVersion: document.version,
        },
      },
      select: { confirmedAt: true },
    }),
  ]);
  const audience = members.filter((member) =>
    documentVisibleToRole(document.visibleToRoles, member.role),
  );
  const audienceIds = new Set(audience.map((member) => member.userId));
  const confirmedCount = confirmations.filter((confirmation) => audienceIds.has(confirmation.userId)).length;

  return JSON.parse(JSON.stringify({
    document,
    currentUserId: user.id,
    userRole: selectedMembership.role,
    confirmationStatus: { confirmedCount, totalUsers: audience.length },
    myConfirmation: mine,
  }));
}
