import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { AllergenClient } from "@/features/ik-mat/components/allergen-client";

export const metadata = { title: "Allergenoversikt | HMS Nova" };

export default async function AllergenPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const items = await prisma.allergenOversikt.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: [{ category: "asc" }, { dishName: "asc" }],
  });

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];

  return (
    <AllergenClient
      items={JSON.parse(JSON.stringify(items))}
      categories={categories}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
