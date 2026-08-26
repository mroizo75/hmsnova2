import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { AktivitetsloggClient } from "./client";
import { Activity } from "lucide-react";

export const metadata = { title: "Aktivitetslogg" };

export default async function AktivitetsloggPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const isAdmin =
    auth.role === "ADMIN" || auth.role === "HMS" || auth.role === "LEDER";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const serialized = logs.map((log) => {
    const user = userMap.get(log.userId);
    return {
      id: log.id,
      userId: log.userId,
      userName: user?.name ?? user?.email ?? "Ukjent bruker",
      action: log.action,
      resource: log.resource,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    };
  });

  const actions = [...new Set(serialized.map((l) => l.action))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-7 w-7 text-primary" />
          Aktivitetslogg
        </h1>
        <p className="text-muted-foreground mt-1">
          Oversikt over alle handlinger utført i systemet. Brukes til
          sporbarhet og internkontroll (IK-HMS § 5, ISO 9001 kap. 10.2).
        </p>
      </div>

      <AktivitetsloggClient logs={serialized} actions={actions} />
    </div>
  );
}
