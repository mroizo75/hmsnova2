import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchMyPersonnelFolder } from "@/server/queries/personnel.queries";
import { PersonnelFolderView } from "@/features/personnel/components/personnel-folder";

export default async function AnsattPersonalmappePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.permissions.canReadOwnPersonnelFile) redirect("/ansatt");

  const folder = await fetchMyPersonnelFolder();
  if (!folder) redirect("/ansatt");

  return (
    <PersonnelFolderView
      folder={folder}
      canUpload={false}
      canDelete={false}
      backHref="/ansatt"
    />
  );
}
