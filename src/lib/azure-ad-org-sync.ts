import { prisma } from "@/lib/db";
import { assertNoManagerCycle } from "@/lib/incident-notification-routing";
import {
  mapEntraOrgProfile,
  pickDepartmentMatch,
  type EntraOrgProfile,
  type GraphManagerPayload,
  type GraphMePayload,
} from "@/lib/azure-ad-org-profile";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export type { EntraOrgProfile };

async function graphGet<T>(accessToken: string, path: string): Promise<T | null> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function fetchEntraOrgProfile(accessToken: string): Promise<EntraOrgProfile | null> {
  const token = accessToken.trim();
  if (!token) return null;

  const me = await graphGet<GraphMePayload>(
    token,
    "/me?$select=jobTitle,department,employeeId,mail,userPrincipalName"
  );
  if (!me) return null;

  const manager = await graphGet<GraphManagerPayload>(
    token,
    "/me/manager?$select=mail,userPrincipalName"
  );

  return mapEntraOrgProfile(me, manager);
}

async function findDepartmentByName(
  tenantId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const departments = await prisma.department.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  return pickDepartmentMatch(departments, name);
}

async function ensureDepartment(
  tenantId: string,
  name: string
): Promise<{ id: string; name: string }> {
  const existing = await findDepartmentByName(tenantId, name);
  if (existing) return existing;

  const maxSort = await prisma.department.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });

  try {
    return await prisma.department.create({
      data: {
        tenantId,
        name,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
      select: { id: true, name: true },
    });
  } catch {
    const raced = await findDepartmentByName(tenantId, name);
    if (!raced) {
      throw new Error("Kunne ikke opprette avdeling fra Entra ID");
    }
    return raced;
  }
}

/**
 * Fyller ansattnummer, stilling, avdeling og nærmeste leder fra Entra ID.
 * AML § 3-1: HMS-ansvar skal kunne plasseres i linjen.
 * Tomme Graph-felt overskriver ikke verdier som allerede ligger i HMS Nova.
 * Feil her skal aldri stoppe innlogging.
 */
export async function syncAzureAdOrgProfile(input: {
  userId: string;
  tenantId: string;
  accessToken: string;
}): Promise<void> {
  try {
    const profile = await fetchEntraOrgProfile(input.accessToken);
    if (!profile) return;

    const membership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: { userId: input.userId, tenantId: input.tenantId },
      },
      select: { id: true },
    });
    if (!membership) return;

    let departmentId: string | null = null;
    let department: string | null = null;
    if (profile.departmentName) {
      const ensured = await ensureDepartment(input.tenantId, profile.departmentName);
      departmentId = ensured.id;
      department = ensured.name;
    }

    let managerId: string | null = null;
    if (profile.managerEmail) {
      const managerUser = await prisma.user.findUnique({
        where: { email: profile.managerEmail },
        select: { id: true },
      });
      if (managerUser && managerUser.id !== input.userId) {
        const managerMembership = await prisma.userTenant.findUnique({
          where: {
            userId_tenantId: { userId: managerUser.id, tenantId: input.tenantId },
          },
          select: { userId: true },
        });
        if (managerMembership) {
          try {
            await assertNoManagerCycle(input.userId, managerUser.id, async (userId) => {
              const row = await prisma.userTenant.findUnique({
                where: { userId_tenantId: { userId, tenantId: input.tenantId } },
                select: { managerId: true },
              });
              return row?.managerId ?? null;
            });
            managerId = managerUser.id;
          } catch {
            managerId = null;
          }
        }
      }
    }

    await prisma.userTenant.update({
      where: { userId_tenantId: { userId: input.userId, tenantId: input.tenantId } },
      data: {
        ...(profile.employeeNumber ? { employeeNumber: profile.employeeNumber } : {}),
        ...(profile.position ? { position: profile.position } : {}),
        ...(departmentId ? { departmentId, department } : {}),
        ...(managerId ? { managerId } : {}),
      },
    });
  } catch {
    // Innlogging skal gå gjennom også når Graph er nede eller mangler samtykke.
  }
}
