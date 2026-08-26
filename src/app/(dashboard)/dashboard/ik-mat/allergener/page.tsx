import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchAllergenData } from "@/server/queries/settings.queries";
import { AllergenContent } from "@/features/ik-mat/components/allergen-content";

export const metadata = { title: "Allergenoversikt | HMS Nova" };

export default async function AllergenPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchAllergenData();

  return (
    <AllergenContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
