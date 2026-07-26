import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { AktivitetssikkerhetClient } from "@/features/aktivitetssikkerhet/components/aktivitetssikkerhet-client";

export const metadata = { title: "Aktivitetssikkerhet | HMS Nova" };

export default async function AktivitetssikkerhetPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const sjekker = await prisma.aktivitetsUtstyrssjekk.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { checkDate: "desc" },
    take: 100,
  });

  const avvikCount = sjekker.filter((s) => s.status === "AVVIK").length;

  return (
    <AktivitetssikkerhetClient
      sjekker={JSON.parse(JSON.stringify(sjekker))}
      avvikCount={avvikCount}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
