import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchIkMatData } from "@/server/queries/settings.queries";
import { IkMatContent } from "@/features/ik-mat/components/ik-mat-content";

export const metadata = { title: "IK-mat og mattrygghet | HMS Nova" };

export default async function IkMatPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadInspections) redirect("/dashboard");

  const initialData = await fetchIkMatData();

  return (
    <IkMatContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateInspections}
    />
  );
}
