import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { TemperaturClient } from "@/features/ik-mat/components/temperatur-client";

export const metadata = { title: "Temperaturlogg | HMS Nova" };

export default async function TemperaturPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const logs = await prisma.temperaturLog.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { measuredAt: "desc" },
    take: 200,
  });

  const units = [...new Set(logs.map((l) => l.unitName))];

  return (
    <TemperaturClient
      logs={JSON.parse(JSON.stringify(logs))}
      units={units}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
