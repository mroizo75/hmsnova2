import { canonicalizeAzureAdEmail } from "@/lib/azure-ad-email";

export type EntraOrgProfile = {
  employeeNumber: string | null;
  position: string | null;
  departmentName: string | null;
  managerEmail: string | null;
};

export type GraphMePayload = {
  jobTitle?: string | null;
  department?: string | null;
  employeeId?: string | number | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

export type GraphManagerPayload = {
  mail?: string | null;
  userPrincipalName?: string | null;
};

function trimTo(value: unknown, max: number): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text.slice(0, max) : null;
}

export function mapEntraOrgProfile(
  me: GraphMePayload,
  manager: GraphManagerPayload | null
): EntraOrgProfile {
  const managerEmail =
    canonicalizeAzureAdEmail(manager?.userPrincipalName) ||
    canonicalizeAzureAdEmail(manager?.mail) ||
    null;

  return {
    employeeNumber: trimTo(me.employeeId, 40),
    position: trimTo(me.jobTitle, 100),
    departmentName: trimTo(me.department, 120),
    managerEmail: managerEmail || null,
  };
}

export function pickDepartmentMatch(
  departments: Array<{ id: string; name: string }>,
  name: string | null
): { id: string; name: string } | null {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  return departments.find((department) => department.name.trim().toLowerCase() === needle) ?? null;
}

export function pickManagerUserId(
  members: Array<{ userId: string; email: string }>,
  managerEmail: string | null,
  selfUserId: string
): string | null {
  if (!managerEmail) return null;
  const match = members.find((member) => member.email.toLowerCase() === managerEmail);
  if (!match || match.userId === selfUserId) return null;
  return match.userId;
}
