import { Prisma, Role } from "@prisma/client";

const ASSIGNABLE: Role[] = [
  "HMS",
  "LEDER",
  "HR",
  "VERNEOMBUD",
  "ANSATT",
  "BHT",
  "REVISOR",
  "VARSLINGSANSVARLIG",
];

const ROLE_SET = new Set<string>(ASSIGNABLE);

export function parseExtraRoles(
  value: string | readonly string[] | null | undefined,
  primary?: string | null,
): Role[] {
  const raw = typeof value === "string" ? value.split(",") : [...(value ?? [])];
  const roles: Role[] = [];
  for (const item of raw) {
    const role = item.trim();
    if (!ROLE_SET.has(role) || role === primary) continue;
    if (!roles.includes(role as Role)) roles.push(role as Role);
  }
  return roles;
}

export function serializeExtraRoles(
  value: readonly string[] | string | null | undefined,
  primary?: string | null,
): string | null {
  const roles = parseExtraRoles(value, primary);
  return roles.length > 0 ? roles.join(",") : null;
}

export function membershipRoles(primary: Role | null | undefined, extra?: string | readonly string[] | null): Role[] {
  const roles: Role[] = [];
  if (primary) roles.push(primary);
  for (const role of parseExtraRoles(extra, primary)) {
    if (!roles.includes(role)) roles.push(role);
  }
  return roles;
}

/** Prisma-filter: treffer hovedrolle eller tilleggsrolle. */
export function roleMatchFilter(roles: readonly string[]): Prisma.UserTenantWhereInput {
  const unique = [...new Set(roles.map((role) => role.trim()).filter(Boolean))] as Role[];
  return {
    OR: [
      { role: { in: unique } },
      ...unique.map((role) => ({ extraRoles: { contains: role } })),
    ],
  };
}
