import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { TransportClient } from "@/features/transport/components/transport-client";

export const metadata = { title: "Transportmodul | HMS Nova" };

export default async function TransportPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const [journaler, sjaforDokumenter, loyveRegister] = await Promise.all([
    prisma.transportJournal.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.sjaforDokument.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: { driverName: "asc" },
    }),
    prisma.loyveRegister.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: { loyveType: "asc" },
    }),
  ]);

  const now = new Date();
  const expiringDocs = [
    ...sjaforDokumenter.filter((d) => d.kbUtlopDato && new Date(d.kbUtlopDato) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
    ...sjaforDokumenter.filter((d) => d.forerkortUtlop && new Date(d.forerkortUtlop) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
    ...loyveRegister.filter((l) => l.utlopDato && new Date(l.utlopDato) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
  ];

  return (
    <TransportClient
      journaler={JSON.parse(JSON.stringify(journaler))}
      sjaforDokumenter={JSON.parse(JSON.stringify(sjaforDokumenter))}
      loyveRegister={JSON.parse(JSON.stringify(loyveRegister))}
      expiringCount={expiringDocs.length}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
