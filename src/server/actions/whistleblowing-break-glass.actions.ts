"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/server/actions/notification.actions";
import { logWhistleblowAccess } from "@/lib/whistleblowing-audit";
import { CONFIDENTIAL_ACCESS_COPY, resolveBreakGlassTargetCase } from "@/lib/whistleblowing-case-access";
import { stringifyAccessObjects, FULL_CASE_OBJECTS } from "@/lib/whistleblowing-objects";
import { hasWhistleblowStepUp } from "@/server/actions/totp.actions";

function fail(code: string, message: string): never {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  throw error;
}

async function requestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
}

export async function requestBreakGlassAccess(input: {
  tenantId: string;
  purpose: string;
  requestedHours?: number;
  whistleblowingId?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (!session.user.isSuperAdmin && !session.user.isSupport)) {
    fail("FORBIDDEN", "Kun HMS Nova-support kan be om nødinnsyn");
  }
  if (!input.purpose.trim()) fail("VALIDATION", "Formål må oppgis");

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true },
  });
  if (!tenant) fail("NOT_FOUND", "Bedriften finnes ikke");

  const hours = Math.min(Math.max(input.requestedHours ?? 4, 1), 8);

  const request = await prisma.whistleblowBreakGlassRequest.create({
    data: {
      tenantId: input.tenantId,
      whistleblowingId: input.whistleblowingId || null,
      requesterId: session.user.id,
      purpose: input.purpose.trim(),
      requestedHours: hours,
    },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: input.tenantId,
    userId: session.user.id,
    action: "BREAK_GLASS_REQUEST",
    whistleblowingId: input.whistleblowingId || null,
    metadata: { requestId: request.id },
    ...meta,
  });

  const handlers = await prisma.userTenant.findMany({
    where: { tenantId: input.tenantId, role: "VARSLINGSANSVARLIG" },
    select: { userId: true },
  });

  await Promise.all(
    handlers.map((handler) =>
      createNotification({
        tenantId: input.tenantId,
        userId: handler.userId,
        type: "BREAK_GLASS_REQUEST",
        title: CONFIDENTIAL_ACCESS_COPY.title,
        message: CONFIDENTIAL_ACCESS_COPY.message,
        link: "/dashboard/whistleblowing",
      }),
    ),
  );

  revalidatePath(`/admin/tenants/${input.tenantId}`);
  return { id: request.id };
}

export async function fetchPendingBreakGlassRequests() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId || session.user.role !== "VARSLINGSANSVARLIG") {
    return [];
  }

  const rows = await prisma.whistleblowBreakGlassRequest.findMany({
    where: { tenantId: session.user.tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { name: true, email: true } },
    },
  });

  return JSON.parse(
    JSON.stringify(
      rows.map((row) => ({
        id: row.id,
        purpose: row.purpose,
        requestedHours: row.requestedHours,
        whistleblowingId: row.whistleblowingId,
        createdAt: row.createdAt,
        requesterName: row.requester.name || row.requester.email,
      })),
    ),
  );
}

export async function decideBreakGlassRequest(input: {
  requestId: string;
  approve: boolean;
  decisionNote?: string;
  whistleblowingId?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId || session.user.role !== "VARSLINGSANSVARLIG") {
    fail("FORBIDDEN", "Bare varslingsansvarlig kan godkjenne nødinnsyn");
  }
  if (!(await hasWhistleblowStepUp(session.user.id))) {
    fail("STEP_UP_REQUIRED", "Tofaktorbekreftelse kreves");
  }

  const request = await prisma.whistleblowBreakGlassRequest.findFirst({
    where: { id: input.requestId, tenantId: session.user.tenantId, status: "PENDING" },
  });
  if (!request) fail("NOT_FOUND", "Forespørselen finnes ikke");

  if (!input.approve) {
    await prisma.whistleblowBreakGlassRequest.update({
      where: { id: request.id },
      data: {
        status: "DENIED",
        decidedById: session.user.id,
        decidedAt: new Date(),
        decisionNote: input.decisionNote?.trim() || null,
      },
    });
    const meta = await requestMeta();
    await logWhistleblowAccess({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "BREAK_GLASS_DENY",
      whistleblowingId: request.whistleblowingId,
      metadata: { requestId: request.id },
      ...meta,
    });
    revalidatePath("/dashboard/whistleblowing");
    return { ok: true };
  }

  const expiresAt = new Date(Date.now() + request.requestedHours * 60 * 60 * 1000);
  const targetCaseId = resolveBreakGlassTargetCase(request.whistleblowingId, input.whistleblowingId);

  if (!targetCaseId) {
    fail("VALIDATION", "Nødinnsyn må knyttes til en navngitt sak");
  }

  const targetCase = await prisma.whistleblowing.findFirst({
    where: { id: targetCaseId, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!targetCase) fail("NOT_FOUND", "Saken finnes ikke i denne bedriften");

  const grant = await prisma.whistleblowAccessGrant.create({
    data: {
      tenantId: session.user.tenantId,
      whistleblowingId: targetCaseId,
      granteeId: request.requesterId,
      grantedById: session.user.id,
      type: "BREAK_GLASS",
      objects: stringifyAccessObjects([...FULL_CASE_OBJECTS]),
      purpose: request.purpose,
      impartialityConfirmedAt: new Date(),
      expiresAt,
    },
  });

  await prisma.whistleblowBreakGlassRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      decidedById: session.user.id,
      decidedAt: new Date(),
      decisionNote: input.decisionNote?.trim() || null,
      grantId: grant.id,
      expiresAt,
      whistleblowingId: targetCaseId,
    },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "BREAK_GLASS_APPROVE",
    whistleblowingId: targetCaseId,
    metadata: { requestId: request.id, grantId: grant.id },
    ...meta,
  });

  await createNotification({
    tenantId: session.user.tenantId,
    userId: request.requesterId,
    type: "CONFIDENTIAL_ACCESS",
    title: CONFIDENTIAL_ACCESS_COPY.title,
    message: CONFIDENTIAL_ACCESS_COPY.message,
    link: `/dashboard/whistleblowing/${targetCaseId}`,
  });

  revalidatePath("/dashboard/whistleblowing");
  return { ok: true, grantId: grant.id };
}

export async function revokeBreakGlassRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId || session.user.role !== "VARSLINGSANSVARLIG") {
    fail("FORBIDDEN", "Ingen tilgang");
  }

  const request = await prisma.whistleblowBreakGlassRequest.findFirst({
    where: { id: requestId, tenantId: session.user.tenantId },
  });
  if (!request) fail("NOT_FOUND", "Forespørselen finnes ikke");

  if (request.grantId) {
    await prisma.whistleblowAccessGrant.update({
      where: { id: request.grantId },
      data: { revokedAt: new Date(), revokedById: session.user.id },
    });
  }

  await prisma.whistleblowBreakGlassRequest.update({
    where: { id: request.id },
    data: { status: "REVOKED", decidedById: session.user.id, decidedAt: new Date() },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "BREAK_GLASS_REVOKE",
    whistleblowingId: request.whistleblowingId,
    metadata: { requestId },
    ...meta,
  });
  revalidatePath("/dashboard/whistleblowing");
  return { ok: true };
}

export async function fetchBreakGlassStatusForTenant(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (!session.user.isSuperAdmin && !session.user.isSupport)) {
    fail("FORBIDDEN", "Ingen tilgang");
  }

  const rows = await prisma.whistleblowBreakGlassRequest.findMany({
    where: { tenantId, requesterId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      grantId: true,
      whistleblowingId: true,
    },
  });
  return JSON.parse(JSON.stringify(rows));
}
