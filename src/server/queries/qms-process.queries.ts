import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { QMS_KIND_ORDER, type QmsProcessKindValue } from "@/lib/qms-processes";

const processInclude = {
  owner: { select: { id: true, name: true } },
  routine: { select: { id: true, title: true } },
  steps: { orderBy: { sortOrder: "asc" as const } },
  outgoing: {
    select: {
      toProcessId: true,
      toProcess: { select: { id: true, name: true } },
    },
  },
} as const;

export async function listQmsProcesses() {
  const context = await getAuthContext();
  if (!context?.permissions.canReadDocuments) return [];
  const rows = await prisma.qmsProcess.findMany({
    where: { tenantId: context.tenantId },
    include: processInclude,
  });
  return rows.sort((a, b) => {
    const kind = QMS_KIND_ORDER.indexOf(a.kind as QmsProcessKindValue) - QMS_KIND_ORDER.indexOf(b.kind as QmsProcessKindValue);
    if (kind !== 0) return kind;
    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "nb");
  });
}

export async function getQmsProcess(id: string) {
  const context = await getAuthContext();
  if (!context?.permissions.canReadDocuments) return null;
  return prisma.qmsProcess.findFirst({
    where: { id, tenantId: context.tenantId },
    include: processInclude,
  });
}

export async function listQmsProcessOptions() {
  const context = await getAuthContext();
  if (!context) return { users: [], routines: [], processes: [] };
  const [users, routines, processes] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId: context.tenantId },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.routine.findMany({
      where: { tenantId: context.tenantId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 200,
    }),
    prisma.qmsProcess.findMany({
      where: { tenantId: context.tenantId },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return {
    users: users.map((row) => row.user),
    routines,
    processes,
  };
}
