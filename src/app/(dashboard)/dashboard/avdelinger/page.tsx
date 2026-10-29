import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchDepartmentLeaders, fetchDepartments } from "@/server/queries/department.queries";
import { fetchDepartmentReports } from "@/server/queries/department-reports.queries";
import { DepartmentsContent } from "@/features/departments/components/departments-content";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";

export default async function AvdelingerPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.permissions.canReadDepartments) redirect("/dashboard");

  const [departments, reports, leaders] = await Promise.all([
    fetchDepartments({ includeInactive: true }),
    fetchDepartmentReports(),
    fetchDepartmentLeaders(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <DepartmentsContent
        departments={departments}
        reports={reports}
        leaders={leaders}
        canManage={auth.permissions.canManageDepartments}
        canImport={auth.permissions.canImportHrDirectory}
        hidePersonnelDetails={!auth.permissions.canReadAllPersonnelFiles && !auth.permissions.canReadDepartmentPersonnelFiles}
      />
    </div>
  );
}
