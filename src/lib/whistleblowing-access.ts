import { Role } from "@prisma/client";
import { getPermissions } from "@/lib/permissions";

export function canViewWhistleblowingInbox(role?: string | null): boolean {
  if (!role) return false;
  return getPermissions(role as Role).canViewWhistleblowing;
}

export function canViewWhistleblowingContent(role?: string | null): boolean {
  if (!role) return false;
  return getPermissions(role as Role).canViewWhistleblowingContent;
}

export function canHandleWhistleblowingCases(role?: string | null): boolean {
  if (!role) return false;
  return getPermissions(role as Role).canHandleWhistleblowing;
}

export type WhistleblowingInboxRow = {
  id: string;
  caseNumber: string;
  status: string;
  receivedAt: Date;
  closedAt: Date | null;
  isAnonymous: boolean;
};

export function toWhistleblowingInboxView<T extends WhistleblowingInboxRow>(
  report: T
): WhistleblowingInboxRow {
  return {
    id: report.id,
    caseNumber: report.caseNumber,
    status: report.status,
    receivedAt: report.receivedAt,
    closedAt: report.closedAt,
    isAnonymous: report.isAnonymous,
  };
}
