import type { Role } from "@prisma/client";
import { parseExtraRoles } from "@/lib/extra-roles";
import { getRoleDisplayName } from "@/lib/permissions";

/**
 * Bygger organisasjonskart fra ansatte og avdelinger.
 * Linjen følger AML § 3-1 og IK-HMS § 5 nr. 5:
 * daglig leder øverst, deretter avdeling, avdelingsleder og øvrige i avdelingen.
 * Verneombud vises etter AML § 6-1, uten å erstatte linjelederen.
 */

export type OrgChartSourcePerson = {
  userId: string;
  name: string;
  role: Role;
  extraRoles: string | null;
  isChiefSafetyRep: boolean;
  managerId: string | null;
  departmentId: string | null;
  position: string | null;
  createdAt: Date;
};

export type OrgChartSourceDepartment = {
  id: string;
  name: string;
  parentId: string | null;
  leaderId: string | null;
  sortOrder: number;
};

export type OrgChartDraftNode = {
  key: string;
  parentKey: string | null;
  title: string;
  name: string | null;
  department: string | null;
  sortOrder: number;
  kind: "PERSON" | "DEPARTMENT";
};

const STAFF_ORDER: Role[] = [
  "HMS",
  "VERNEOMBUD",
  "HR",
  "VARSLINGSANSVARLIG",
  "BHT",
  "REVISOR",
];

function hasRole(person: OrgChartSourcePerson, role: Role): boolean {
  if (person.role === role) return true;
  return parseExtraRoles(person.extraRoles, person.role).includes(role);
}

function titleFor(
  person: OrgChartSourcePerson,
  isDagligLeder: boolean,
  leadsDepartment: boolean,
): string {
  const parts: string[] = [];
  if (isDagligLeder) parts.push("Daglig leder");
  else if (leadsDepartment) parts.push(person.position?.trim() || "Leder");
  else if (hasRole(person, "LEDER")) parts.push(person.position?.trim() || "Leder");
  else if (person.position?.trim() && person.role !== "ANSATT") parts.push(person.position.trim());

  if (hasRole(person, "HMS")) parts.push("HMS-ansvarlig");
  if (person.isChiefSafetyRep) parts.push("Hovedverneombud");
  else if (hasRole(person, "VERNEOMBUD")) parts.push("Verneombud");
  if (!isDagligLeder && hasRole(person, "HR")) parts.push("HR");
  if (hasRole(person, "VARSLINGSANSVARLIG")) parts.push("Varslingsansvarlig");
  if (hasRole(person, "BHT")) parts.push("Bedriftshelsetjeneste");
  if (hasRole(person, "REVISOR")) parts.push("Revisor");

  if (parts.length === 0) {
    parts.push(person.position?.trim() || getRoleDisplayName(person.role));
  }
  return [...new Set(parts)].join(" · ");
}

function departmentName(
  person: OrgChartSourcePerson,
  departments: Map<string, OrgChartSourceDepartment>,
  leadingIds: string[],
): string | null {
  const names = leadingIds
    .map((id) => departments.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  if (names.length > 0) return names.join(", ");
  if (!person.departmentId) return null;
  return departments.get(person.departmentId)?.name ?? null;
}

export function buildOrgChartFromEmployees(
  people: OrgChartSourcePerson[],
  departments: OrgChartSourceDepartment[],
): OrgChartDraftNode[] {
  if (people.length === 0) return [];

  const byUser = new Map(people.map((person) => [person.userId, person]));
  const admins = people
    .filter((person) => person.role === "ADMIN")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.name.localeCompare(b.name, "nb"));
  const dagligLederId = admins[0]?.userId ?? null;
  const rootKey = dagligLederId ? `user:${dagligLederId}` : "role:daglig-leder";

  const deptById = new Map(departments.map((department) => [department.id, department]));
  const childrenByParent = new Map<string | null, OrgChartSourceDepartment[]>();
  for (const department of departments) {
    const parentId = department.parentId && deptById.has(department.parentId) ? department.parentId : null;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(department);
    childrenByParent.set(parentId, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "nb"));
  }

  const leadingByUser = new Map<string, string[]>();
  for (const department of departments) {
    if (!department.leaderId || !byUser.has(department.leaderId)) continue;
    if (department.leaderId === dagligLederId) continue;
    const list = leadingByUser.get(department.leaderId) ?? [];
    list.push(department.id);
    leadingByUser.set(department.leaderId, list);
  }

  const nodes: OrgChartDraftNode[] = [];
  const placedUsers = new Set<string>();
  const anchors = new Map<string, string>();

  if (dagligLederId) {
    const leader = byUser.get(dagligLederId)!;
    nodes.push({
      key: rootKey,
      parentKey: null,
      title: titleFor(leader, true, false),
      name: leader.name,
      department: null,
      sortOrder: 0,
      kind: "PERSON",
    });
    placedUsers.add(dagligLederId);
  } else {
    nodes.push({
      key: rootKey,
      parentKey: null,
      title: "Daglig leder",
      name: null,
      department: null,
      sortOrder: 0,
      kind: "PERSON",
    });
  }

  function addPerson(person: OrgChartSourcePerson, parentKey: string, sortOrder: number) {
    if (placedUsers.has(person.userId)) return;
    const leading = leadingByUser.get(person.userId) ?? [];
    nodes.push({
      key: `user:${person.userId}`,
      parentKey,
      title: titleFor(person, false, leading.length > 0),
      name: person.name,
      department: departmentName(person, deptById, leading),
      sortOrder,
      kind: "PERSON",
    });
    placedUsers.add(person.userId);
  }

  function walkDepartment(department: OrgChartSourceDepartment, parentAnchor: string) {
    const deptKey = `dept:${department.id}`;
    nodes.push({
      key: deptKey,
      parentKey: parentAnchor,
      title: department.name,
      name: null,
      department: department.name,
      sortOrder: 10 + department.sortOrder,
      kind: "DEPARTMENT",
    });

    const leaderId =
      department.leaderId &&
      department.leaderId !== dagligLederId &&
      byUser.has(department.leaderId)
        ? department.leaderId
        : null;

    let peopleAnchor = deptKey;
    if (leaderId) {
      peopleAnchor = `user:${leaderId}`;
      addPerson(byUser.get(leaderId)!, deptKey, 0);
    }
    anchors.set(department.id, peopleAnchor);

    for (const child of childrenByParent.get(department.id) ?? []) {
      walkDepartment(child, deptKey);
    }
  }

  for (const department of childrenByParent.get(null) ?? []) {
    walkDepartment(department, rootKey);
  }

  function ensurePerson(userId: string, stack: Set<string>) {
    if (placedUsers.has(userId)) return;
    const person = byUser.get(userId);
    if (!person) return;
    if (stack.has(userId)) {
      addPerson(person, rootKey, 300 + nodes.length);
      return;
    }
    stack.add(userId);

    let parentKey = rootKey;
    const managerId = person.managerId && person.managerId !== userId ? person.managerId : null;
    if (managerId && byUser.has(managerId) && managerId !== dagligLederId) {
      ensurePerson(managerId, stack);
      if (placedUsers.has(managerId)) parentKey = `user:${managerId}`;
    } else if (person.departmentId && anchors.has(person.departmentId)) {
      parentKey = anchors.get(person.departmentId)!;
    }

    const staffRank = STAFF_ORDER.findIndex((role) => hasRole(person, role));
    const sortOrder =
      parentKey === rootKey && staffRank >= 0 && !leadingByUser.has(person.userId)
        ? 80 + staffRank
        : 200 + nodes.length;
    addPerson(person, parentKey, sortOrder);
    stack.delete(userId);
  }

  const rest = [...people].sort((a, b) => a.name.localeCompare(b.name, "nb"));
  for (const person of rest) {
    ensurePerson(person.userId, new Set());
  }

  return nodes;
}
