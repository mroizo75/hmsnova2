import { prisma } from "@/lib/db";
import { assertNoManagerCycle } from "@/lib/incident-notification-routing";
import {
  mapEntraOrgProfile,
  pickDepartmentMatch,
  pickManagerUserId,
  type EntraOrgProfile,
  type GraphManagerPayload,
  type GraphMePayload,
} from "@/lib/azure-ad-org-profile";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const ME_SELECT = "jobTitle,department,employeeId,mail,userPrincipalName";
const MANAGER_SELECT = "id,displayName,mail,userPrincipalName";

export type { EntraOrgProfile };

function graphPath(path: string, query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `${path}?${params.toString()}`;
}

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
    graphPath("/me", {
      $select: ME_SELECT,
      $expand: `manager($select=${MANAGER_SELECT})`,
    })
  );
  if (!me) return null;

  let manager = me.manager ?? null;
  if (!manager) {
    manager = await graphGet<GraphManagerPayload>(
      token,
      graphPath("/me/manager", { $select: MANAGER_SELECT })
    );
  }
  if (!manager) {
    manager = await graphGet<GraphManagerPayload>(token, "/me/manager");
  }

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

async function resolveManagerUserId(input: {
  userId: string;
  tenantId: string;
  profile: EntraOrgProfile;
}): Promise<string | null> {
  const memberships = await prisma.userTenant.findMany({
    where: { tenantId: input.tenantId },
    select: {
      userId: true,
      user: {
        select: {
          email: true,
          name: true,
          accounts: {
            where: { provider: "azure-ad" },
            select: { providerAccountId: true },
            take: 1,
          },
        },
      },
    },
  });

  const managerId = pickManagerUserId(
    memberships.map((membership) => ({
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name,
      entraObjectId: membership.user.accounts[0]?.providerAccountId ?? null,
    })),
    {
      entraObjectId: input.profile.managerObjectId,
      emails: input.profile.managerEmails,
      displayName: input.profile.managerDisplayName,
    },
    input.userId
  );
  if (!managerId) return null;

  try {
    await assertNoManagerCycle(input.userId, managerId, async (userId) => {
      const row = await prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId, tenantId: input.tenantId } },
        select: { managerId: true },
      });
      return row?.managerId ?? null;
    });
    return managerId;
  } catch {
    return null;
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

    const managerId = await resolveManagerUserId({
      userId: input.userId,
      tenantId: input.tenantId,
      profile,
    });

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
