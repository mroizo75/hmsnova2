import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchVaremottakData } from "@/server/queries/settings.queries";
import { VaremottakContent } from "@/features/ik-mat/components/varemottak-content";

export const metadata = { title: "Varemottak og sporbarhet | HMS Nova" };

export default async function VaremottakPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchVaremottakData();

  return (
    <VaremottakContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
