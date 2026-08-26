"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function fetchBcmData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) return null;

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) return null;

  const tenantId = selectedMembership.tenantId;

  const [bcmDocuments, auditsRaw, bcmForms] = await Promise.all([
    prisma.document.findMany({
      where: {
        tenantId,
        template: { category: "BCM" },
      },
      select: {
        id: true,
        title: true,
        version: true,
        status: true,
        updatedAt: true,
        nextReviewDate: true,
        template: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.audit.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        status: true,
        leadAuditorId: true,
        area: true,
      },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.formTemplate.findMany({
      where: {
        OR: [
          { tenantId, category: "BCM" },
          { isGlobal: true, category: "BCM" },
        ],
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        _count: {
          select: {
            submissions: { where: { tenantId } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return JSON.parse(JSON.stringify({ bcmDocuments, auditsRaw, bcmForms }));
}
