import { redirect } from "next/navigation";
import { FolderArchive } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchPersonnelEmployees } from "@/server/queries/personnel.queries";
import { PersonnelEmployeeList } from "@/features/personnel/components/personnel-employee-list";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";

export default async function PersonalarkivPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const canList =
    auth.permissions.canReadAllPersonnelFiles || auth.permissions.canReadDepartmentPersonnelFiles;

  if (!canList) {
    if (auth.permissions.canReadOwnPersonnelFile) {
      redirect(`/dashboard/personalarkiv/${auth.userId}`);
    }
    redirect("/dashboard");
  }

  const employees = await fetchPersonnelEmployees();

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FolderArchive className="h-6 w-6 text-primary" />
            Personalarkiv
          </h1>
          <p className="mt-1 text-muted-foreground">
            Personalmapper i Cloudflare R2 – GDPR art. 5, 6 og 15. Arbeidsavtale og attest
            hører hjemme her (AML § 14-5/14-6 og § 15-15), ikke i Dokumenter.
          </p>
        </div>
        <PageHelpDialog content={helpContent.personnelArchive} />
      </div>

      <PersonnelEmployeeList employees={employees} />
    </div>
  );
}
