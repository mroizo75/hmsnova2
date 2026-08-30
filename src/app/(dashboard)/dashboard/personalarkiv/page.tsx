import { redirect } from "next/navigation";
import { FolderArchive } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchPersonnelEmployees } from "@/server/queries/personnel.queries";
import { PersonnelEmployeeList } from "@/features/personnel/components/personnel-employee-list";

export default async function PersonalarkivPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  if (!auth.permissions.canReadAllPersonnelFiles) {
    if (auth.permissions.canReadOwnPersonnelFile) {
      redirect(`/dashboard/personalarkiv/${auth.userId}`);
    }
    redirect("/dashboard");
  }

  const employees = await fetchPersonnelEmployees();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FolderArchive className="h-6 w-6 text-primary" />
            Personalarkiv
          </h1>
          <p className="mt-1 text-muted-foreground">
            Personalmapper i Cloudflare R2 – GDPR art. 5, 6 og 15. Helseopplysninger hører ikke hjemme her.
          </p>
        </div>
        <PageHelpDialog content={helpContent.personnelArchive} />
      </div>

      <PersonnelEmployeeList employees={employees} />
    </div>
  );
}
