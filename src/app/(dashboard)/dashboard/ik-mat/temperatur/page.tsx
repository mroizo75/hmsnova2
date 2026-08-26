import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchTemperaturData } from "@/server/queries/settings.queries";
import { TemperaturContent } from "@/features/ik-mat/components/temperatur-content";

export const metadata = { title: "Temperaturlogg | HMS Nova" };

export default async function TemperaturPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchTemperaturData();

  return (
    <TemperaturContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
