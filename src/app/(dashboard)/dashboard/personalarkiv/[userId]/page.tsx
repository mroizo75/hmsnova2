import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchPersonnelFolder } from "@/server/queries/personnel.queries";
import { PersonnelFolderView } from "@/features/personnel/components/personnel-folder";

export default async function PersonalmappePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const folder = await fetchPersonnelFolder(userId);
  if (!folder) redirect("/dashboard/personalarkiv");

  return (
    <div className="p-6">
      <PersonnelFolderView
        folder={folder}
        canUpload={auth.permissions.canUploadPersonnelFile}
        canDelete={auth.permissions.canDeletePersonnelFile}
        backHref={auth.permissions.canReadAllPersonnelFiles ? "/dashboard/personalarkiv" : null}
      />
    </div>
  );
}
