import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { BhtNattarbeidClient } from "@/features/bht-nattarbeid/components/bht-nattarbeid-client";

export const metadata = { title: "BHT og nattarbeid | HMS Nova" };

export default async function BhtNattarbeidPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadDocuments) redirect("/dashboard");

  const [avtaler, vurderinger] = await Promise.all([
    prisma.bhtAvtale.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { startDato: "desc" },
    }),
    prisma.nattarbeidVurdering.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeBht = avtaler.find((a) => a.isActive);
  const bhtExpired = activeBht?.sluttDato
    ? new Date(activeBht.sluttDato) < new Date()
    : false;

  return (
    <BhtNattarbeidClient
      avtaler={JSON.parse(JSON.stringify(avtaler))}
      vurderinger={JSON.parse(JSON.stringify(vurderinger))}
      bhtExpired={bhtExpired}
      canEdit={auth.permissions.canCreateDocuments}
    />
  );
}
