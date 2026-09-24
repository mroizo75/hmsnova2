import { canonicalizeAzureAdEmail } from "@/lib/azure-ad-email";

export type EntraOrgProfile = {
  employeeNumber: string | null;
  position: string | null;
  departmentName: string | null;
  managerEmails: string[];
  managerObjectId: string | null;
  managerDisplayName: string | null;
};

export type GraphManagerPayload = {
  id?: string | null;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
};

export type GraphMePayload = {
  jobTitle?: string | null;
  department?: string | null;
  employeeId?: string | number | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  manager?: GraphManagerPayload | null;
};

export type ManagerCandidate = {
  userId: string;
  email: string;
  name: string | null;
  entraObjectId: string | null;
};

function trimTo(value: unknown, max: number): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text.slice(0, max) : null;
}

function uniqueEmails(...values: Array<string | null | undefined>): string[] {
  const emails = values
    .map((value) => canonicalizeAzureAdEmail(value))
    .filter((email): email is string => Boolean(email));
  return [...new Set(emails)];
}

export function mapEntraOrgProfile(
  me: GraphMePayload,
  manager: GraphManagerPayload | null
): EntraOrgProfile {
  const resolvedManager = manager ?? me.manager ?? null;

  return {
    employeeNumber: trimTo(me.employeeId, 40),
    position: trimTo(me.jobTitle, 100),
    departmentName: trimTo(me.department, 120),
    managerEmails: uniqueEmails(resolvedManager?.userPrincipalName, resolvedManager?.mail),
    managerObjectId: trimTo(resolvedManager?.id, 64),
    managerDisplayName: trimTo(resolvedManager?.displayName, 120),
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
  members: ManagerCandidate[],
  lookup: {
    entraObjectId: string | null;
    emails: string[];
    displayName: string | null;
  },
  selfUserId: string
): string | null {
  const others = members.filter((member) => member.userId !== selfUserId);

  if (lookup.entraObjectId) {
    const byOid = others.find((member) => member.entraObjectId === lookup.entraObjectId);
    if (byOid) return byOid.userId;
  }

  const emails = new Set(lookup.emails.map((email) => email.toLowerCase()));
  if (emails.size > 0) {
    const byEmail = others.find((member) => emails.has(member.email.toLowerCase()));
    if (byEmail) return byEmail.userId;
  }

  const name = lookup.displayName?.trim().toLowerCase();
  if (name) {
    const byName = others.filter((member) => (member.name ?? "").trim().toLowerCase() === name);
    if (byName.length === 1) return byName[0].userId;
  }

  return null;
}
