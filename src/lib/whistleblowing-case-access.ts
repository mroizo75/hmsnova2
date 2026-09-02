/**
 * Sakbasert tilgangsmotor for varsling.
 * Rolle gir aldri automatisk innsyn — unntatt VARSLINGSANSVARLIG som ikke er omvarslet.
 */

import type { AccessObject } from "@/lib/whistleblowing-objects";
import { FULL_CASE_OBJECTS, hasAccessObject, parseAccessObjects } from "@/lib/whistleblowing-objects";
import { isAccusedOfCase } from "@/lib/whistleblowing-impartiality";

export type GrantSnapshot = {
  id: string;
  granteeId: string;
  type: string;
  objects: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type AccessActor = {
  userId: string;
  role?: string | null;
  isSuperAdmin?: boolean;
  isSupport?: boolean;
};

export type CaseAccessDecision = {
  allowed: boolean;
  reason: "HANDLER" | "GRANT" | "INHABILE" | "DENIED";
  objects: AccessObject[];
  grantId?: string;
  grantType?: string;
};

export function isGrantActive(grant: GrantSnapshot, now = new Date()): boolean {
  if (grant.revokedAt) return false;
  return grant.expiresAt.getTime() > now.getTime();
}

export function resolveCaseAccess(input: {
  actor: AccessActor;
  accusedUserIds: string[];
  grants: GrantSnapshot[];
  now?: Date;
}): CaseAccessDecision {
  const now = input.now ?? new Date();

  if (input.actor.isSuperAdmin || input.actor.isSupport) {
    const breakGlass = input.grants.find(
      (grant) =>
        grant.granteeId === input.actor.userId &&
        grant.type === "BREAK_GLASS" &&
        isGrantActive(grant, now),
    );
    if (breakGlass) {
      return {
        allowed: true,
        reason: "GRANT",
        objects: parseAccessObjects(breakGlass.objects),
        grantId: breakGlass.id,
        grantType: breakGlass.type,
      };
    }
    return { allowed: false, reason: "DENIED", objects: [] };
  }

  if (isAccusedOfCase(input.actor.userId, input.accusedUserIds)) {
    const statementGrant = input.grants.find(
      (grant) =>
        grant.granteeId === input.actor.userId &&
        grant.type === "STATEMENT" &&
        isGrantActive(grant, now),
    );
    if (statementGrant) {
      return {
        allowed: true,
        reason: "GRANT",
        objects: parseAccessObjects(statementGrant.objects),
        grantId: statementGrant.id,
        grantType: statementGrant.type,
      };
    }
    return { allowed: false, reason: "INHABILE", objects: [] };
  }

  if (input.actor.role === "VARSLINGSANSVARLIG") {
    return { allowed: true, reason: "HANDLER", objects: [...FULL_CASE_OBJECTS] };
  }

  const active = input.grants.filter(
    (grant) => grant.granteeId === input.actor.userId && isGrantActive(grant, now),
  );
  if (active.length === 0) {
    return { allowed: false, reason: "DENIED", objects: [] };
  }

  const objects = [...new Set(active.flatMap((grant) => parseAccessObjects(grant.objects)))];
  return {
    allowed: objects.length > 0,
    reason: "GRANT",
    objects,
    grantId: active[0]?.id,
    grantType: active[0]?.type,
  };
}

export function canSeeObject(decision: CaseAccessDecision, object: AccessObject): boolean {
  return decision.allowed && hasAccessObject(decision.objects, object);
}

export type OriginalDto = {
  id: string;
  caseNumber: string;
  category: string;
  title: string;
  description: string;
  occurredAt: Date | null;
  location: string | null;
  involvedPersons: string | null;
  witnesses: string | null;
  isAnonymous: boolean;
  status: string;
  severity: string;
  receivedAt: Date;
  acknowledgedAt: Date | null;
  investigatedAt: Date | null;
  closedAt: Date | null;
  attachments?: string | null;
};

export type IdentityDto = {
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;
};

export type CaseViewDto = {
  access: CaseAccessDecision;
  original: OriginalDto | null;
  identity: IdentityDto | null;
  notes: string | null;
  attachments: string | null;
  outcome: string | null;
  closedReason: string | null;
  assignedTo: string | null;
  handledBy: string | null;
};

export function toCaseViewDto(input: {
  decision: CaseAccessDecision;
  report: OriginalDto & {
    investigationNotes: string | null;
    outcome: string | null;
    closedReason: string | null;
    assignedTo: string | null;
    handledBy: string | null;
    attachments: string | null;
  };
  identity: IdentityDto | null;
}): CaseViewDto {
  const { decision, report, identity } = input;
  const original = canSeeObject(decision, "ORIGINAL")
    ? {
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
        attachments: canSeeObject(decision, "ATTACHMENTS") ? report.attachments : null,
      }
    : decision.reason === "GRANT" && canSeeObject(decision, "MEASURE")
      ? null
      : decision.reason === "GRANT" && canSeeObject(decision, "STATEMENT")
        ? {
            id: report.id,
            caseNumber: report.caseNumber,
            category: report.category,
            title: "Konfidensiell sak",
            description: "",
            occurredAt: null,
            location: null,
            involvedPersons: null,
            witnesses: null,
            isAnonymous: true,
            status: report.status,
            severity: report.severity,
            receivedAt: report.receivedAt,
            acknowledgedAt: report.acknowledgedAt,
            investigatedAt: report.investigatedAt,
            closedAt: report.closedAt,
            attachments: null,
          }
        : null;

  return {
    access: decision,
    original,
    identity: canSeeObject(decision, "IDENTITY") ? identity : null,
    notes: canSeeObject(decision, "NOTES") ? report.investigationNotes : null,
    attachments: canSeeObject(decision, "ATTACHMENTS") ? report.attachments : null,
    outcome: canSeeObject(decision, "NOTES") || canSeeObject(decision, "ORIGINAL") ? report.outcome : null,
    closedReason: canSeeObject(decision, "NOTES") ? report.closedReason : null,
    assignedTo: decision.reason === "HANDLER" ? report.assignedTo : null,
    handledBy: decision.reason === "HANDLER" ? report.handledBy : null,
  };
}

export type MeasureRecipientDto = {
  id: string;
  title: string;
  description: string;
  dueAt: Date | null;
  status: string;
  completedAt: Date | null;
  completionNote: string | null;
};

export function toMeasureRecipientDto(measure: MeasureRecipientDto): MeasureRecipientDto {
  return {
    id: measure.id,
    title: measure.title,
    description: measure.description,
    dueAt: measure.dueAt,
    status: measure.status,
    completedAt: measure.completedAt,
    completionNote: measure.completionNote,
  };
}

export type StatementRecipientDto = {
  id: string;
  summary: string;
  dueAt: Date | null;
  status: string;
  response: string | null;
  submittedAt: Date | null;
};

export function toStatementRecipientDto(statement: StatementRecipientDto): StatementRecipientDto {
  return {
    id: statement.id,
    summary: statement.summary,
    dueAt: statement.dueAt,
    status: statement.status,
    response: statement.response,
    submittedAt: statement.submittedAt,
  };
}

export const CONFIDENTIAL_ACCESS_COPY = {
  title: "Konfidensiell sak",
  message: "Du har fått tilgang til en konfidensiell sak",
} as const;

const TRACK_HIDDEN_FIELDS = [
  "handledBy",
  "assignedTo",
  "investigationNotes",
  "closedReason",
  "outcome",
  "attachments",
  "actions",
] as const;

export function toPublicTrackView<T extends Record<string, unknown>>(report: T) {
  const publicData = { ...report };
  for (const field of TRACK_HIDDEN_FIELDS) {
    delete publicData[field];
  }
  return publicData;
}

export function resolveBreakGlassTargetCase(
  requestCaseId?: string | null,
  approvalCaseId?: string | null,
): string | null {
  return requestCaseId || approvalCaseId || null;
}
