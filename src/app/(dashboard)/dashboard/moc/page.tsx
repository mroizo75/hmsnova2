import { redirect } from "next/navigation";
import Link from "next/link";
import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchMocList } from "@/server/queries/moc.queries";
import { MocListContent } from "@/features/moc/components/moc-list-content";

export default async function DashboardMocPage() {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }
  const data = await fetchMocList();

  if (!data.moduleEnabled) {
    redirect("/dashboard");
  }

  const canCreate = auth.permissions.canCreateMoc;
  const canReadAll = auth.permissions.canReadMoc;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-teal-700" />
              Endringsledelse
            </h1>
            <p className="text-muted-foreground">
              Styr planlagte og utilsiktede endringer før de iverksettes (ISO 45001 krav 8.1.3).
            </p>
          </div>
          <PageHelpDialog content={helpContent.moc} />
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/moc/new">
              <Plus className="h-4 w-4 mr-1" />
              Ny endring
            </Link>
          </Button>
        )}
      </div>

      {!canReadAll && (
        <Alert>
          <AlertDescription>
            Du ser egne og saker du er berørt av. HMS og leder godkjenner før iverksetting.
          </AlertDescription>
        </Alert>
      )}

      <MocListContent data={data} />
    </div>
  );
}
