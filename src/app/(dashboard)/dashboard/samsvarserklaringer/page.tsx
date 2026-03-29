import { redirect } from "next/navigation";
import { FileCheck2 } from "lucide-react";
import { getCurrentUser } from "@/lib/server-action";
import { getPermissions } from "@/lib/permissions";
import { helpContent } from "@/lib/help-content";
import { getElectroForDashboard } from "@/server/actions/electro.actions";
import { ElectroAdminPanel } from "@/features/elektro/components/electro-admin-panel";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ComplianceDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const membership = user.tenants.at(0);
  if (!membership) {
    return <div className="p-6">Ingen tilgang til virksomhet.</div>;
  }

  const permissions = getPermissions(membership.role);
  if (!permissions.canReadDocuments) {
    redirect("/dashboard");
  }

  const result = await getElectroForDashboard();
  if (result.success === false) {
    return (
      <div className="p-6">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  const compliance = result.data.compliance.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    originalFileName: c.originalFileName,
    fileKey: c.fileKey,
    mime: c.mime,
    contractorName: c.contractorName,
    workCompletedAt: c.workCompletedAt ? c.workCompletedAt.toISOString() : null,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    createdById: c.createdById,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 sm:text-3xl">
            <FileCheck2 className="h-7 w-7 text-blue-600" />
            Samsvarserklæringer
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Samle samsvarserklæringer fra elektro, rørlegger, ventilasjon og andre fag. Synlig for alle ansatte.
          </p>
        </div>
        {helpContent.electrical && <PageHelpDialog content={helpContent.electrical} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registrerte erklæringer</CardDescription>
            <CardTitle className="text-2xl">{compliance.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">samsvarserklæringer i systemet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Siste opplasting</CardDescription>
            <CardTitle className="text-base">
              {compliance.length > 0
                ? new Date(compliance[0].createdAt).toLocaleDateString("nb-NO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Ingen ennå"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {compliance.length > 0 ? compliance[0].title : "Last opp din første erklæring"}
            </p>
          </CardContent>
        </Card>
      </div>

      <ElectroAdminPanel
        compliance={compliance}
        currentUserId={user.id}
        canCreate={permissions.canCreateDocuments}
        canDeleteAny={permissions.canDeleteDocuments}
      />
    </div>
  );
}
