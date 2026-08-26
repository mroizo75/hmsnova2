import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchBeredskapReiselivData } from "@/server/queries/settings.queries";
import { BeredskapReiselivContent } from "@/features/beredskap-reiseliv/components/beredskap-reiseliv-content";

export const metadata = { title: "Beredskap – Reiseliv | HMS Nova" };

export default async function BeredskapReiselivPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadIncidents) redirect("/dashboard");

  const initialData = await fetchBeredskapReiselivData();

  return (
    <BeredskapReiselivContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateIncidents}
    />
  );
}
