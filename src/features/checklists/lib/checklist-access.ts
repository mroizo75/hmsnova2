export const CHECKLIST_ACCESS_MODES = ["ALL", "ROLES", "USERS", "ROLES_AND_USERS"] as const;

export type ChecklistAccessMode = (typeof CHECKLIST_ACCESS_MODES)[number];

export type ChecklistResponseValue = "OK" | "DEVIATION" | "NOT_APPLICABLE";

export function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    ),
  ];
}

export function userCanFillChecklist(input: {
  access: ChecklistAccessMode;
  allowedRoles: readonly string[];
  allowedUserIds: readonly string[];
  userId: string;
  roles: readonly string[];
  canManage: boolean;
}): boolean {
  if (input.canManage) return true;
  if (input.access === "ALL") return true;
  const roleHit = input.roles.some((role) => input.allowedRoles.includes(role));
  const userHit = input.allowedUserIds.includes(input.userId);
  if (input.access === "ROLES") return roleHit;
  if (input.access === "USERS") return userHit;
  return roleHit || userHit;
}

export function userCanViewChecklistRun(input: {
  userId: string;
  submittedById: string;
  resultRecipientIds: readonly string[];
  canManage: boolean;
}): boolean {
  if (input.canManage) return true;
  if (input.userId === input.submittedById) return true;
  return input.resultRecipientIds.includes(input.userId);
}

export function summarizeChecklistResponses(responses: readonly ChecklistResponseValue[]) {
  return {
    okCount: responses.filter((item) => item === "OK").length,
    deviationCount: responses.filter((item) => item === "DEVIATION").length,
    notApplicableCount: responses.filter((item) => item === "NOT_APPLICABLE").length,
    total: responses.length,
  };
}

export function accessLabel(access: ChecklistAccessMode, roleCount: number, userCount: number): string {
  if (access === "ALL") return "Alle i bedriften";
  if (access === "ROLES") return roleCount === 1 ? "1 rolle" : `${roleCount} roller`;
  if (access === "USERS") return userCount === 1 ? "1 person" : `${userCount} personer`;
  return "Roller og personer";
}

export function nextChecklistReference(latest: string | null, year: number): string {
  const prefix = `SJK-${year}-`;
  if (!latest?.startsWith(prefix)) return `${prefix}001`;
  const current = Number(latest.slice(prefix.length));
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function responseLabel(response: ChecklistResponseValue): string {
  if (response === "OK") return "OK";
  if (response === "DEVIATION") return "Avvik";
  return "Ikke aktuelt";
}
