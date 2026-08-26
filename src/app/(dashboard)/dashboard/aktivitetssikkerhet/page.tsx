import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchAktivitetssikkerhet } from "@/server/queries/aktivitetssikkerhet.queries";
import { AktivitetssikkerhetContent } from "@/features/aktivitetssikkerhet/components/aktivitetssikkerhet-content";

export const metadata = { title: "Aktivitetssikkerhet | HMS Nova" };

export default async function AktivitetssikkerhetPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchAktivitetssikkerhet();

  return (
    <AktivitetssikkerhetContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
