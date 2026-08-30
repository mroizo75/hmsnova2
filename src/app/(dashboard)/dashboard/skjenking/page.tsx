import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchSkjenkingData } from "@/server/queries/settings.queries";
import { SkjenkingContent } from "@/features/skjenking/components/skjenking-content";

export const metadata = { title: "Internkontroll skjenking | HMS Nova" };

export default async function SkjenkingPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchSkjenkingData();

  return (
    <SkjenkingContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
