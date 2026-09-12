import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchPersonnelFolder } from "@/server/queries/personnel.queries";
import { fetchEmployeeHrThread } from "@/server/queries/hr-overview.queries";
import { PersonnelFolderView } from "@/features/personnel/components/personnel-folder";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";
import { EmployeeHrThreadCard } from "@/features/hr/components/employee-hr-thread";

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

  const hrThread = await fetchEmployeeHrThread(userId);

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <PersonnelFolderView
        folder={folder}
        canUpload={auth.permissions.canUploadPersonnelFile}
        canDelete={auth.permissions.canDeletePersonnelFile}
        backHref={
          auth.permissions.canReadAllPersonnelFiles || auth.permissions.canReadDepartmentPersonnelFiles
            ? "/dashboard/personalarkiv"
            : null
        }
        canEditHrFields={
          auth.permissions.canReadHrNotes || auth.permissions.canReadDepartmentPersonnelFiles
        }
        canEditNotes={auth.permissions.canReadHrNotes}
        canEditKin={auth.userId === userId || auth.permissions.canReadHrNotes}
        canEditBirthDate={auth.userId === userId || auth.permissions.canReadHrNotes}
        hrThread={hrThread}
      />
    </div>
  );
}
