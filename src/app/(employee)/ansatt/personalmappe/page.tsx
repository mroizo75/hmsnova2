import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchMyPersonnelFolder, fetchPersonnelDevelopment } from "@/server/queries/personnel.queries";
import { PersonnelFolderView } from "@/features/personnel/components/personnel-folder";
import { EmployeeHrWorkspaceNav } from "@/features/hr/components/employee-hr-workspace-nav";

export default async function AnsattPersonalmappePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.permissions.canReadOwnPersonnelFile) redirect("/ansatt");

  const [folder, development] = await Promise.all([
    fetchMyPersonnelFolder(),
    fetchPersonnelDevelopment(auth.userId),
  ]);
  if (!folder) redirect("/ansatt");

  return (
    <div className="space-y-6">
      <EmployeeHrWorkspaceNav />
      <PersonnelFolderView
        folder={folder}
        canUpload={false}
        canDelete={false}
        backHref="/ansatt"
        development={development}
        reviewBaseHref="/ansatt/medarbeidersamtale"
      />
    </div>
  );
}
