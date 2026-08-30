import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchRenholdData } from "@/server/queries/settings.queries";
import { RenholdContent } from "@/features/ik-mat/components/renhold-content";

export const metadata = { title: "Renholdslogg | HMS Nova" };

export default async function RenholdPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchRenholdData();

  return (
    <RenholdContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
