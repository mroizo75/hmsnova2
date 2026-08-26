import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchBhtNattarbeidData } from "@/server/queries/settings.queries";
import { BhtNattarbeidContent } from "@/features/bht-nattarbeid/components/bht-nattarbeid-content";

export const metadata = { title: "BHT og nattarbeid | HMS Nova" };

export default async function BhtNattarbeidPage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canReadDocuments) redirect("/dashboard");

  const initialData = await fetchBhtNattarbeidData();

  return (
    <BhtNattarbeidContent
      initialData={initialData}
      canEdit={auth.permissions.canCreateDocuments}
    />
  );
}
