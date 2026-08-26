import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchHaccpData } from "@/server/queries/settings.queries";
import { HaccpContent } from "@/features/ik-mat/components/haccp-content";

export const metadata = { title: "HACCP Fareanalyse | HMS Nova" };

export default async function HaccpPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchHaccpData();

  return (
    <HaccpContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
