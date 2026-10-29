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
