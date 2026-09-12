import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchDepartments } from "@/server/queries/department.queries";
import { fetchDepartmentReports } from "@/server/queries/department-reports.queries";
import { DepartmentsContent } from "@/features/departments/components/departments-content";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";

export default async function AvdelingerPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.permissions.canReadDepartments) redirect("/dashboard");

  const [departments, reports] = await Promise.all([fetchDepartments({ includeInactive: true }), fetchDepartmentReports()]);

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <DepartmentsContent
        departments={departments}
        reports={reports}
        canManage={auth.permissions.canManageDepartments}
        canImport={auth.permissions.canImportHrDirectory}
        hidePersonnelDetails={!auth.permissions.canReadAllPersonnelFiles && !auth.permissions.canReadDepartmentPersonnelFiles}
      />
    </div>
  );
}
