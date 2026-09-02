"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import type { WhistleblowGrantType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/server/actions/notification.actions";
import { logWhistleblowAccess } from "@/lib/whistleblowing-audit";
import {
  CONFIDENTIAL_ACCESS_COPY,
  resolveCaseAccess,
  toCaseViewDto,
  toMeasureRecipientDto,
  toStatementRecipientDto,
  type GrantSnapshot,
} from "@/lib/whistleblowing-case-access";
import { evaluateImpartiality } from "@/lib/whistleblowing-impartiality";
import {
  DEFAULT_ASSIGN_OBJECTS,
  DEFAULT_ASSIST_OBJECTS,
  FULL_CASE_OBJECTS,
  MEASURE_OBJECTS,
  STATEMENT_OBJECTS,
  stringifyAccessObjects,
  type AccessObject,
} from "@/lib/whistleblowing-objects";
import {
  decryptWhistleblowIdentity,
  encryptWhistleblowIdentity,
} from "@/lib/whistleblowing-crypto";
import { hasWhistleblowStepUp } from "@/server/actions/totp.actions";
import { canHandleWhistleblowingCases } from "@/lib/whistleblowing-access";

const DEFAULT_GRANT_DAYS = 30;
const ACTION_ERROR = { code: "FORBIDDEN", message: "Ingen tilgang" } as const;

function fail(code: string, message: string): never {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  throw error;
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    fail("UNAUTHORIZED", "Ikke innlogget");
  }
  return session as typeof session & { user: { id: string; tenantId: string; role?: string } };
}

async function requireStepUp(userId: string) {
  const ok = await hasWhistleblowStepUp(userId);
  if (!ok) fail("STEP_UP_REQUIRED", "Tofaktorbekreftelse kreves");
}

async function requestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
}

async function loadAccusedUserIds(whistleblowingId: string): Promise<string[]> {
  const parties = await prisma.whistleblowParty.findMany({
    where: { whistleblowingId, role: "ACCUSED", userId: { not: null } },
    select: { userId: true },
  });
  return parties.map((p) => p.userId).filter((id): id is string => Boolean(id));
}

async function loadGrants(whistleblowingId: string): Promise<GrantSnapshot[]> {
  return prisma.whistleblowAccessGrant.findMany({
    where: { whistleblowingId },
    select: {
      id: true,
      granteeId: true,
      type: true,
      objects: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
}

export async function getWhistleblowCaseView(caseId: string) {
  const session = await requireSession();
  await requireStepUp(session.user.id);

  const report = await prisma.whistleblowing.findFirst({
    where: { id: caseId, tenantId: session.user.tenantId },
    include: {
      identity: true,
      messages: { orderBy: { createdAt: "asc" } },
      parties: true,
      grants: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
      },
      measures: { orderBy: { createdAt: "desc" } },
      statements: { orderBy: { createdAt: "desc" } },
      gdprAssessments: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!report) fail("NOT_FOUND", "Saken finnes ikke");

  const accusedUserIds = report.parties
    .filter((p) => p.role === "ACCUSED" && p.userId)
    .map((p) => p.userId as string);

  const decision = resolveCaseAccess({
    actor: {
      userId: session.user.id,
      role: session.user.role,
      isSuperAdmin: session.user.isSuperAdmin,
      isSupport: session.user.isSupport,
    },
    accusedUserIds,
    grants: report.grants,
  });

  if (!decision.allowed) {
    fail(decision.reason === "INHABILE" ? "INHABILE" : "FORBIDDEN", "Ingen tilgang til saken");
  }

  const identity = report.identity
    ? decryptWhistleblowIdentity(report.identity)
    : { reporterName: null, reporterEmail: null, reporterPhone: null };

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: decision.objects.includes("IDENTITY") ? "IDENTITY_VIEW" : "VIEW",
    whistleblowingId: report.id,
    object: decision.objects.join(","),
    ...meta,
  });

  const view = toCaseViewDto({
    decision,
    report: {
      id: report.id,
      caseNumber: report.caseNumber,
      category: report.category,
      title: report.title,
      description: report.description,
      occurredAt: report.occurredAt,
      location: report.location,
      involvedPersons: report.involvedPersons,
      witnesses: report.witnesses,
      isAnonymous: report.isAnonymous,
      status: report.status,
      severity: report.severity,
      receivedAt: report.receivedAt,
      acknowledgedAt: report.acknowledgedAt,
      investigatedAt: report.investigatedAt,
      closedAt: report.closedAt,
      investigationNotes: report.investigationNotes,
      outcome: report.outcome,
      closedReason: report.closedReason,
      assignedTo: report.assignedTo,
      handledBy: report.handledBy,
      attachments: report.attachments,
    },
    identity,
  });

  const isHandler = decision.reason === "HANDLER";
  const publicMessages = report.messages.filter((m) => !m.isInternal || decision.objects.includes("NOTES"));

  return JSON.parse(
    JSON.stringify({
      ...view,
      messages: publicMessages.map((m) => ({
        id: m.id,
        sender: m.sender,
        message: m.message,
        isInternal: m.isInternal,
        createdAt: m.createdAt,
      })),
      parties: isHandler ? report.parties : [],
      grants: isHandler
        ? report.grants.map((g) => ({
            id: g.id,
            type: g.type,
            granteeId: g.granteeId,
            objects: g.objects,
            purpose: g.purpose,
            expiresAt: g.expiresAt,
            createdAt: g.createdAt,
          }))
        : [],
      measures: isHandler
        ? report.measures
        : report.measures
            .filter((m) => m.assigneeId === session.user.id)
            .map((m) => toMeasureRecipientDto(m)),
      statements: isHandler
        ? report.statements
        : report.statements
            .filter((s) => s.assigneeId === session.user.id)
            .map((s) => toStatementRecipientDto(s)),
      gdprAssessments: isHandler ? report.gdprAssessments : [],
    }),
  );
}

async function requireHandlerForCase(caseId: string, userId: string, tenantId: string, role?: string | null) {
  await requireStepUp(userId);
  const report = await prisma.whistleblowing.findFirst({
    where: { id: caseId, tenantId },
    include: { parties: true, identity: true },
  });
  if (!report) fail("NOT_FOUND", "Saken finnes ikke");

  const accusedUserIds = report.parties
    .filter((p) => p.role === "ACCUSED" && p.userId)
    .map((p) => p.userId as string);

  const grants = await loadGrants(caseId);
  const decision = resolveCaseAccess({
    actor: { userId, role },
    accusedUserIds,
    grants,
  });

  if (decision.reason !== "HANDLER") {
    fail("FORBIDDEN", "Bare varslingsansvarlig kan utføre denne handlingen");
  }

  return { report, accusedUserIds };
}

async function notifyConfidentialAccess(tenantId: string, userId: string, link: string) {
  await createNotification({
    tenantId,
    userId,
    type: "CONFIDENTIAL_ACCESS",
    title: CONFIDENTIAL_ACCESS_COPY.title,
    message: CONFIDENTIAL_ACCESS_COPY.message,
    link,
  });
}

async function checkImpartialityForUser(input: {
  tenantId: string;
  caseId: string;
  candidateUserId: string;
  accusedUserIds: string[];
  involvedText?: string | null;
  description?: string | null;
  identity?: { reporterName: string | null; reporterEmail: string | null };
}) {
  const [candidate, identity] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.candidateUserId, tenants: { some: { tenantId: input.tenantId } } },
      select: {
        id: true,
        name: true,
        email: true,
        tenants: {
          where: { tenantId: input.tenantId },
          select: { userId: true, managerId: true },
        },
      },
    }),
    input.identity
      ? Promise.resolve(input.identity)
      : prisma.whistleblowIdentity.findUnique({ where: { whistleblowingId: input.caseId } }).then((row) =>
          row ? decryptWhistleblowIdentity(row) : { reporterName: null, reporterEmail: null, reporterPhone: null },
        ),
  ]);

  if (!candidate) fail("NOT_FOUND", "Mottakeren finnes ikke i virksomheten");

  const reporterManager = identity.reporterEmail
    ? await prisma.userTenant.findFirst({
        where: {
          tenantId: input.tenantId,
          user: { email: identity.reporterEmail },
        },
        select: { managerId: true, userId: true },
      })
    : null;

  return evaluateImpartiality({
    candidateUserId: candidate.id,
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    accusedUserIds: input.accusedUserIds,
    reporterUserId: reporterManager?.userId ?? null,
    reporterName: identity.reporterName,
    reporterEmail: identity.reporterEmail,
    reporterManagerId: reporterManager?.managerId ?? null,
    involvedText: input.involvedText,
    description: input.description,
  });
}

export async function previewImpartiality(caseId: string, candidateUserId: string) {
  const session = await requireSession();
  const { report, accusedUserIds } = await requireHandlerForCase(
    caseId,
    session.user.id,
    session.user.tenantId,
    session.user.role,
  );
  return checkImpartialityForUser({
    tenantId: session.user.tenantId,
    caseId,
    candidateUserId,
    accusedUserIds,
    involvedText: report.involvedPersons,
    description: report.description,
  });
}

async function createGrant(input: {
  tenantId: string;
  caseId: string;
  grantedById: string;
  granteeId: string;
  type: WhistleblowGrantType;
  objects: AccessObject[];
  purpose: string;
  expiresAt: Date;
  impartialityConfirmed: boolean;
}) {
  if (!input.purpose.trim()) fail("VALIDATION", "Formål må oppgis");
  if (!input.impartialityConfirmed) fail("VALIDATION", "Habilitet må bekreftes");

  const accusedUserIds = await loadAccusedUserIds(input.caseId);
  const report = await prisma.whistleblowing.findFirst({
    where: { id: input.caseId, tenantId: input.tenantId },
    select: { involvedPersons: true, description: true },
  });
  if (!report) fail("NOT_FOUND", "Saken finnes ikke");

  const impartiality = await checkImpartialityForUser({
    tenantId: input.tenantId,
    caseId: input.caseId,
    candidateUserId: input.granteeId,
    accusedUserIds,
    involvedText: report.involvedPersons,
    description: report.description,
  });

  const allowAccused = input.type === "STATEMENT" || input.type === "MEASURE";
  if (impartiality.blocked && !allowAccused) {
    fail("INHABILE", impartiality.warnings[0]?.message ?? "Mottakeren er inhabil");
  }

  return prisma.whistleblowAccessGrant.create({
    data: {
      tenantId: input.tenantId,
      whistleblowingId: input.caseId,
      granteeId: input.granteeId,
      grantedById: input.grantedById,
      type: input.type,
      objects: stringifyAccessObjects(input.objects),
      purpose: input.purpose.trim(),
      impartialityConfirmedAt: new Date(),
      expiresAt: input.expiresAt,
    },
  });
}

export async function assignWhistleblowCase(input: {
  caseId: string;
  granteeId: string;
  purpose: string;
  impartialityConfirmed: boolean;
  fullAccess?: boolean;
  expiresInDays?: number;
}) {
  const session = await requireSession();
  await requireHandlerForCase(input.caseId, session.user.id, session.user.tenantId, session.user.role);

  const objects = input.fullAccess ? [...FULL_CASE_OBJECTS] : [...DEFAULT_ASSIGN_OBJECTS];
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? DEFAULT_GRANT_DAYS) * 24 * 60 * 60 * 1000);
  const grant = await createGrant({
    tenantId: session.user.tenantId,
    caseId: input.caseId,
    grantedById: session.user.id,
    granteeId: input.granteeId,
    type: "ASSIGN",
    objects,
    purpose: input.purpose,
    expiresAt,
    impartialityConfirmed: input.impartialityConfirmed,
  });

  await prisma.whistleblowing.update({
    where: { id: input.caseId },
    data: { assignedTo: input.granteeId },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "GRANT",
    whistleblowingId: input.caseId,
    object: "ASSIGN",
    metadata: { grantId: grant.id, granteeId: input.granteeId, fullAccess: Boolean(input.fullAccess) },
    ...meta,
  });

  await notifyConfidentialAccess(
    session.user.tenantId,
    input.granteeId,
    `/dashboard/whistleblowing/${input.caseId}`,
  );
  revalidatePath(`/dashboard/whistleblowing/${input.caseId}`);
  return { id: grant.id };
}

export async function requestWhistleblowAssistance(input: {
  caseId: string;
  granteeId: string;
  purpose: string;
  impartialityConfirmed: boolean;
  objects: AccessObject[];
  expiresInDays?: number;
}) {
  const session = await requireSession();
  await requireHandlerForCase(input.caseId, session.user.id, session.user.tenantId, session.user.role);

  const selected = input.objects.length > 0 ? input.objects : DEFAULT_ASSIST_OBJECTS;
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? DEFAULT_GRANT_DAYS) * 24 * 60 * 60 * 1000);
  const grant = await createGrant({
    tenantId: session.user.tenantId,
    caseId: input.caseId,
    grantedById: session.user.id,
    granteeId: input.granteeId,
    type: "ASSIST",
    objects: selected,
    purpose: input.purpose,
    expiresAt,
    impartialityConfirmed: input.impartialityConfirmed,
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "GRANT",
    whistleblowingId: input.caseId,
    object: "ASSIST",
    metadata: { grantId: grant.id, objects: selected },
    ...meta,
  });

  await notifyConfidentialAccess(
    session.user.tenantId,
    input.granteeId,
    `/dashboard/whistleblowing/${input.caseId}`,
  );
  revalidatePath(`/dashboard/whistleblowing/${input.caseId}`);
  return { id: grant.id };
}

export async function createWhistleblowMeasureTask(input: {
  caseId: string;
  assigneeId: string;
  title: string;
  description: string;
  purpose: string;
  impartialityConfirmed: boolean;
  dueAt?: string | null;
  expiresInDays?: number;
}) {
  const session = await requireSession();
  await requireHandlerForCase(input.caseId, session.user.id, session.user.tenantId, session.user.role);

  if (!input.title.trim() || !input.description.trim()) {
    fail("VALIDATION", "Tiltaket må ha tittel og beskrivelse");
  }

  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? DEFAULT_GRANT_DAYS) * 24 * 60 * 60 * 1000);
  const grant = await createGrant({
    tenantId: session.user.tenantId,
    caseId: input.caseId,
    grantedById: session.user.id,
    granteeId: input.assigneeId,
    type: "MEASURE",
    objects: [...MEASURE_OBJECTS],
    purpose: input.purpose,
    expiresAt,
    impartialityConfirmed: input.impartialityConfirmed,
  });

  const measure = await prisma.whistleblowMeasure.create({
    data: {
      tenantId: session.user.tenantId,
      whistleblowingId: input.caseId,
      grantId: grant.id,
      title: input.title.trim(),
      description: input.description.trim(),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      createdById: session.user.id,
      assigneeId: input.assigneeId,
    },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "GRANT",
    whistleblowingId: input.caseId,
    object: "MEASURE",
    metadata: { grantId: grant.id, measureId: measure.id },
    ...meta,
  });

  await notifyConfidentialAccess(
    session.user.tenantId,
    input.assigneeId,
    `/konfidensielt/tiltak/${measure.id}`,
  );
  revalidatePath(`/dashboard/whistleblowing/${input.caseId}`);
  return { id: measure.id };
}

export async function sendWhistleblowStatement(input: {
  caseId: string;
  assigneeId: string;
  summary: string;
  purpose: string;
  impartialityConfirmed: boolean;
  dueAt?: string | null;
  expiresInDays?: number;
}) {
  const session = await requireSession();
  await requireHandlerForCase(input.caseId, session.user.id, session.user.tenantId, session.user.role);

  if (!input.summary.trim()) fail("VALIDATION", "Saksfremstillingen kan ikke være tom");

  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? DEFAULT_GRANT_DAYS) * 24 * 60 * 60 * 1000);
  const grant = await createGrant({
    tenantId: session.user.tenantId,
    caseId: input.caseId,
    grantedById: session.user.id,
    granteeId: input.assigneeId,
    type: "STATEMENT",
    objects: [...STATEMENT_OBJECTS],
    purpose: input.purpose,
    expiresAt,
    impartialityConfirmed: input.impartialityConfirmed,
  });

  const statement = await prisma.whistleblowStatement.create({
    data: {
      whistleblowingId: input.caseId,
      grantId: grant.id,
      summary: input.summary.trim(),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      createdById: session.user.id,
      assigneeId: input.assigneeId,
    },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "GRANT",
    whistleblowingId: input.caseId,
    object: "STATEMENT",
    metadata: { grantId: grant.id, statementId: statement.id },
    ...meta,
  });

  await notifyConfidentialAccess(
    session.user.tenantId,
    input.assigneeId,
    `/konfidensielt/uttalelse/${statement.id}`,
  );
  revalidatePath(`/dashboard/whistleblowing/${input.caseId}`);
  return { id: statement.id };
}

export async function revokeWhistleblowGrant(grantId: string) {
  const session = await requireSession();
  await requireStepUp(session.user.id);
  if (!canHandleWhistleblowingCases(session.user.role)) fail("FORBIDDEN", ACTION_ERROR.message);

  const grant = await prisma.whistleblowAccessGrant.findFirst({
    where: { id: grantId, tenantId: session.user.tenantId },
  });
  if (!grant) fail("NOT_FOUND", "Tilgangen finnes ikke");

  await prisma.whistleblowAccessGrant.update({
    where: { id: grantId },
    data: { revokedAt: new Date(), revokedById: session.user.id },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "REVOKE",
    whistleblowingId: grant.whistleblowingId,
    object: grant.type,
    metadata: { grantId },
    ...meta,
  });
  revalidatePath(`/dashboard/whistleblowing/${grant.whistleblowingId}`);
  return { ok: true };
}

export async function addWhistleblowParty(input: {
  caseId: string;
  role: "ACCUSED" | "WITNESS" | "MENTIONED";
  userId?: string | null;
  displayName?: string | null;
}) {
  const session = await requireSession();
  await requireHandlerForCase(input.caseId, session.user.id, session.user.tenantId, session.user.role);

  const party = await prisma.whistleblowParty.create({
    data: {
      whistleblowingId: input.caseId,
      role: input.role,
      userId: input.userId || null,
      displayName: input.displayName?.trim() || null,
    },
  });
  revalidatePath(`/dashboard/whistleblowing/${input.caseId}`);
  return party;
}

export async function removeWhistleblowParty(partyId: string) {
  const session = await requireSession();
  const party = await prisma.whistleblowParty.findFirst({
    where: { id: partyId, whistleblowing: { tenantId: session.user.tenantId } },
  });
  if (!party) fail("NOT_FOUND", "Parten finnes ikke");
  await requireHandlerForCase(party.whistleblowingId, session.user.id, session.user.tenantId, session.user.role);
  await prisma.whistleblowParty.delete({ where: { id: partyId } });
  revalidatePath(`/dashboard/whistleblowing/${party.whistleblowingId}`);
  return { ok: true };
}

export async function recordGdprAccessAssessment(input: {
  caseId: string;
  decision: "WITHHOLD" | "DISCLOSE" | "PARTIAL";
  legalBasis: string;
  rationale: string;
}) {
  const session = await requireSession();
  await requireHandlerForCase(input.caseId, session.user.id, session.user.tenantId, session.user.role);
  if (!input.rationale.trim()) fail("VALIDATION", "Begrunnelse er påkrevd (POL § 16)");

  const row = await prisma.whistleblowGdprAssessment.create({
    data: {
      whistleblowingId: input.caseId,
      assessedById: session.user.id,
      decision: input.decision,
      legalBasis: input.legalBasis.trim() || "POL § 16",
      rationale: input.rationale.trim(),
    },
  });

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "GDPR_ACCESS_ASSESSMENT",
    whistleblowingId: input.caseId,
    metadata: { decision: input.decision, assessmentId: row.id },
    ...meta,
  });
  revalidatePath(`/dashboard/whistleblowing/${input.caseId}`);
  return { id: row.id };
}

export async function fetchConfidentialInbox() {
  const session = await requireSession();
  const now = new Date();

  const grants = await prisma.whistleblowAccessGrant.findMany({
    where: {
      tenantId: session.user.tenantId,
      granteeId: session.user.id,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      measure: true,
      statement: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return JSON.parse(
    JSON.stringify({
      measures: grants
        .filter((g) => g.type === "MEASURE" && g.measure)
        .map((g) => toMeasureRecipientDto(g.measure!)),
      statements: grants
        .filter((g) => g.type === "STATEMENT" && g.statement)
        .map((g) => toStatementRecipientDto(g.statement!)),
      cases: grants
        .filter((g) => g.type === "ASSIGN" || g.type === "ASSIST" || g.type === "BREAK_GLASS")
        .map((g) => ({
          grantId: g.id,
          type: g.type,
          whistleblowingId: g.whistleblowingId,
          expiresAt: g.expiresAt,
        })),
    }),
  );
}

export async function getConfidentialMeasure(measureId: string) {
  const session = await requireSession();
  await requireStepUp(session.user.id);

  const measure = await prisma.whistleblowMeasure.findFirst({
    where: { id: measureId, tenantId: session.user.tenantId, assigneeId: session.user.id },
    include: { grant: true },
  });
  if (!measure || measure.grant.revokedAt || measure.grant.expiresAt < new Date()) {
    fail("FORBIDDEN", "Ingen tilgang");
  }

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "VIEW",
    whistleblowingId: measure.whistleblowingId,
    object: "MEASURE",
    metadata: { measureId },
    ...meta,
  });

  return JSON.parse(JSON.stringify(toMeasureRecipientDto(measure)));
}

export async function completeConfidentialMeasure(measureId: string, note?: string) {
  const session = await requireSession();
  await requireStepUp(session.user.id);
  const measure = await prisma.whistleblowMeasure.findFirst({
    where: { id: measureId, tenantId: session.user.tenantId, assigneeId: session.user.id },
    include: { grant: true },
  });
  if (!measure || measure.grant.revokedAt || measure.grant.expiresAt < new Date()) {
    fail("FORBIDDEN", "Ingen tilgang");
  }

  const updated = await prisma.whistleblowMeasure.update({
    where: { id: measureId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completionNote: note?.trim() || null,
    },
  });
  return JSON.parse(JSON.stringify(toMeasureRecipientDto(updated)));
}

export async function getConfidentialStatement(statementId: string) {
  const session = await requireSession();
  await requireStepUp(session.user.id);
  const statement = await prisma.whistleblowStatement.findFirst({
    where: { id: statementId, assigneeId: session.user.id },
    include: { grant: true, whistleblowing: { select: { tenantId: true } } },
  });
  if (
    !statement ||
    statement.whistleblowing.tenantId !== session.user.tenantId ||
    statement.grant.revokedAt ||
    statement.grant.expiresAt < new Date()
  ) {
    fail("FORBIDDEN", "Ingen tilgang");
  }

  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "VIEW",
    whistleblowingId: statement.whistleblowingId,
    object: "STATEMENT",
    metadata: { statementId },
    ...meta,
  });

  return JSON.parse(JSON.stringify(toStatementRecipientDto(statement)));
}

export async function submitConfidentialStatement(statementId: string, response: string) {
  const session = await requireSession();
  await requireStepUp(session.user.id);
  if (!response.trim()) fail("VALIDATION", "Uttalelsen kan ikke være tom");

  const statement = await prisma.whistleblowStatement.findFirst({
    where: { id: statementId, assigneeId: session.user.id },
    include: { grant: true, whistleblowing: { select: { tenantId: true } } },
  });
  if (
    !statement ||
    statement.whistleblowing.tenantId !== session.user.tenantId ||
    statement.grant.revokedAt ||
    statement.grant.expiresAt < new Date()
  ) {
    fail("FORBIDDEN", "Ingen tilgang");
  }

  const updated = await prisma.whistleblowStatement.update({
    where: { id: statementId },
    data: {
      response: response.trim(),
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
  return JSON.parse(JSON.stringify(toStatementRecipientDto(updated)));
}

export async function fetchWhistleblowAuditLog(caseId: string) {
  const session = await requireSession();
  await requireHandlerForCase(caseId, session.user.id, session.user.tenantId, session.user.role);
  const logs = await prisma.whistleblowAuditLog.findMany({
    where: { whistleblowingId: caseId, tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true } } },
  });
  return JSON.parse(JSON.stringify(logs));
}

export async function logWhistleblowClientEvent(caseId: string, action: "PRINT" | "DOWNLOAD") {
  const session = await requireSession();
  await requireStepUp(session.user.id);
  const meta = await requestMeta();
  await logWhistleblowAccess({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action,
    whistleblowingId: caseId,
    ...meta,
  });
}

export async function userHasConfidentialInbox(userId: string, tenantId: string): Promise<boolean> {
  const count = await prisma.whistleblowAccessGrant.count({
    where: {
      tenantId,
      granteeId: userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return count > 0;
}

export { encryptWhistleblowIdentity };
