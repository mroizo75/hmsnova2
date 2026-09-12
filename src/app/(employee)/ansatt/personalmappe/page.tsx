import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchMyPersonnelFolder } from "@/server/queries/personnel.queries";
import { PersonnelFolderView } from "@/features/personnel/components/personnel-folder";
import { EmployeeHrWorkspaceNav } from "@/features/hr/components/employee-hr-workspace-nav";

export default async function AnsattPersonalmappePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.permissions.canReadOwnPersonnelFile) redirect("/ansatt");

  const folder = await fetchMyPersonnelFolder();
  if (!folder) redirect("/ansatt");

  return (
    <div className="space-y-6">
      <EmployeeHrWorkspaceNav />
      <PersonnelFolderView
        folder={folder}
        canUpload={false}
        canDelete={false}
        backHref="/ansatt"
      />
    </div>
  );
}
