import { prisma } from "@/lib/db";

export function documentVisibleToRole(visibleToRoles: unknown, role: string): boolean {
  if (!visibleToRoles) return true;
  const roles = Array.isArray(visibleToRoles) ? visibleToRoles : [];
  if (roles.length === 0) return true;
  return roles.some((item) => item === role);
}

export async function pendingReadConfirmations(input: {
  tenantId: string;
  userId: string;
  role: string;
}) {
  const documents = await prisma.document.findMany({
    where: {
      tenantId: input.tenantId,
      status: "APPROVED",
      requiresReadConfirmation: true,
    },
    select: {
      id: true,
      title: true,
      version: true,
      visibleToRoles: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const visible = documents.filter((document) =>
    documentVisibleToRole(document.visibleToRoles, input.role),
  );
  if (visible.length === 0) return [];

  const confirmations = await prisma.documentConfirmation.findMany({
    where: {
      userId: input.userId,
      documentId: { in: visible.map((document) => document.id) },
    },
    select: { documentId: true, documentVersion: true },
  });

  return visible.filter(
    (document) =>
      !confirmations.some(
        (confirmation) =>
          confirmation.documentId === document.id &&
          confirmation.documentVersion === document.version,
      ),
  );
}
