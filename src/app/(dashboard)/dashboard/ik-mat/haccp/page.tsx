import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { HaccpBuilderClient } from "@/features/ik-mat/components/haccp-builder-client";

export const metadata = { title: "HACCP Fareanalyse | HMS Nova" };

export default async function HaccpPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const planer = await prisma.haccpPlan.findMany({
    where: { tenantId: auth.tenantId },
    include: { ccp: { orderBy: { order: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <HaccpBuilderClient
      planer={JSON.parse(JSON.stringify(planer))}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
