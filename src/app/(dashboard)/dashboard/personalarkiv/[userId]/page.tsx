import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import {
  fetchPersonnelFolder,
  fetchHrDocumentTemplates,
  fetchPersonnelDevelopment,
} from "@/server/queries/personnel.queries";
import { fetchEmployeeHrThread } from "@/server/queries/hr-overview.queries";
import { fetchEmployeeOrgOptions } from "@/server/queries/users.queries";
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

  const canEditContact = auth.permissions.canManageUsers || folder.managerId === auth.userId;
  const canEditOrg = auth.permissions.canManageUsers;
  const [hrThread, hrTemplates, development, orgOptions] = await Promise.all([
    fetchEmployeeHrThread(userId),
    auth.permissions.canUploadPersonnelFile ? fetchHrDocumentTemplates() : Promise.resolve([]),
    fetchPersonnelDevelopment(userId),
    canEditOrg ? fetchEmployeeOrgOptions() : Promise.resolve({ departments: [], managers: [] }),
  ]);

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
        canEditKin={
          auth.userId === userId ||
          auth.permissions.canReadHrNotes ||
          auth.role === "LEDER" ||
          folder.managerId === auth.userId
        }
        canEditBirthDate={
          auth.userId === userId ||
          auth.permissions.canReadHrNotes ||
          folder.managerId === auth.userId
        }
        canEditContact={canEditContact}
        canEditOrg={canEditOrg}
        departments={orgOptions.departments}
        managers={orgOptions.managers}
        hrThread={hrThread}
        hrTemplates={hrTemplates}
        development={development}
      />
    </div>
  );
}
