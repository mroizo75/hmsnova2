export type DepartmentNode = {
  id: string;
  parentId: string | null;
  leaderId: string | null;
};

/** Avdelinger lederen selv leder, egen avdeling, og alle avdelinger under disse. */
export function ledDepartmentIds(
  departments: DepartmentNode[],
  userId: string,
  ownDepartmentId: string | null,
): string[] {
  const known = new Set(departments.map((department) => department.id));
  const roots = new Set<string>();
  for (const department of departments) {
    if (department.leaderId === userId) roots.add(department.id);
  }
  if (ownDepartmentId && known.has(ownDepartmentId)) roots.add(ownDepartmentId);

  const children = new Map<string, string[]>();
  for (const department of departments) {
    if (!department.parentId) continue;
    const list = children.get(department.parentId) ?? [];
    list.push(department.id);
    children.set(department.parentId, list);
  }

  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return [...seen];
}

function idsWithDescendants(
  departments: Array<{ id: string; parentId: string | null }>,
  roots: readonly string[],
): string[] {
  const children = new Map<string, string[]>();
  for (const department of departments) {
    if (!department.parentId) continue;
    const list = children.get(department.parentId) ?? [];
    list.push(department.id);
    children.set(department.parentId, list);
  }

  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return [...seen];
}

/** Verneombudets område og alle avdelinger under det. */
export function safetyRepresentativeAreaIds(
  departments: Array<{ id: string; parentId: string | null; safetyRepresentativeId: string | null }>,
  userId: string,
): string[] {
  const roots = departments
    .filter((department) => department.safetyRepresentativeId === userId)
    .map((department) => department.id);
  return idsWithDescendants(departments, roots);
}

/** Verneombud på avdelingen og på overordnede områder. */
export function safetyRepresentativesForDepartment(
  departments: Array<{ id: string; parentId: string | null; safetyRepresentativeId: string | null }>,
  departmentId: string | null,
): string[] {
  if (!departmentId) return [];
  const byId = new Map(departments.map((department) => [department.id, department]));
  const ids: string[] = [];
  const seen = new Set<string>();
  let current: string | null = departmentId;
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = byId.get(current);
    if (!node) break;
    if (node.safetyRepresentativeId) ids.push(node.safetyRepresentativeId);
    current = node.parentId;
  }
  return [...new Set(ids)];
}

export function departmentParentCreatesCycle(
  departments: DepartmentNode[],
  departmentId: string,
  parentId: string | null,
): boolean {
  if (!parentId) return false;
  if (parentId === departmentId) return true;
  const byId = new Map(departments.map((department) => [department.id, department.parentId]));
  const seen = new Set<string>([departmentId]);
  let current: string | null = parentId;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current) ?? null;
  }
  return false;
}
