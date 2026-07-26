import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { BeredskapReiselivClient } from "@/features/beredskap-reiseliv/components/beredskap-reiseliv-client";

export const metadata = { title: "Beredskap – Reiseliv | HMS Nova" };

export default async function BeredskapReiselivPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadIncidents) redirect("/dashboard");

  const [hendelser, evakueringsplaner] = await Promise.all([
    prisma.gjesteHendelse.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    prisma.hotellEvakueringsplan.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <BeredskapReiselivClient
      hendelser={JSON.parse(JSON.stringify(hendelser))}
      evakueringsplaner={JSON.parse(JSON.stringify(evakueringsplaner))}
      canEdit={auth.permissions.canCreateIncidents}
    />
  );
}
