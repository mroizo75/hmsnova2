import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { IkMatClient } from "@/features/ik-mat/components/ik-mat-client";

export const metadata = { title: "IK-mat og HACCP | HMS Nova" };

export default async function IkMatPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const [haccpPlans, latestLogs, allergenItems, inspeksjoner] = await Promise.all([
    prisma.haccpPlan.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      include: { ccp: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.temperaturLog.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { measuredAt: "desc" },
      take: 20,
    }),
    prisma.allergenOversikt.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { dishName: "asc" }],
    }),
    prisma.mattilsynetInspeksjon.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { inspectedAt: "desc" },
      take: 5,
    }),
  ]);

  const deviationCount = latestLogs.filter((l) => l.isDeviation).length;

  return (
    <IkMatClient
      haccpPlans={JSON.parse(JSON.stringify(haccpPlans))}
      latestLogs={JSON.parse(JSON.stringify(latestLogs))}
      allergenItems={JSON.parse(JSON.stringify(allergenItems))}
      inspeksjoner={JSON.parse(JSON.stringify(inspeksjoner))}
      deviationCount={deviationCount}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
