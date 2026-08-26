import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchTransportData } from "@/server/queries/settings.queries";
import { TransportContent } from "@/features/transport/components/transport-content";

export const metadata = { title: "Transportmodul | HMS Nova" };

export default async function TransportPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchTransportData();

  return (
    <TransportContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
