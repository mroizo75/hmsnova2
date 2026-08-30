import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadIncidentDialog } from "@/features/incidents/components/upload-incident-dialog";
import { IncidentsContent } from "@/features/incidents/components/incidents-content";
import { Plus, Info, Send } from "lucide-react";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";
import { fetchIncidents } from "@/server/queries/incident.queries";

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ kilde?: string }>;
}) {
  const t = await getTranslations("dashboardIncidentsPage");
  const { kilde } = await searchParams;
  const isIkMat = kilde === "ik-mat";

  const auth = await getAuthContext();
  const { permissions } = auth;

  const canReadAll = permissions.canReadIncidents;
  const canReadOwn = permissions.canReadOwnIncidents;
  const canCreate = permissions.canCreateIncidents;

  if (!canReadAll && !canReadOwn && !canCreate) {
    redirect("/dashboard");
  }

  const showOwnOnlyNotice = !canReadAll && canReadOwn;
  const showCreateOnlyNotice = !canReadAll && !canReadOwn && canCreate;

  const initialIncidents = await fetchIncidents({ kilde });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{isIkMat ? "IK-mat-avvik" : t("title")}</h1>
            <p className="text-muted-foreground">
              {isIkMat
                ? "Avvik fra temperatur, renhold, varemottak, HACCP og allergener. IK-mat § 5 nr. 4–5."
                : t("description")}
            </p>
            {isIkMat && (
              <p className="text-xs text-muted-foreground mt-1">
                <Link href="/dashboard/ik-mat" className="hover:underline">Tilbake til IK-mat</Link>
                {" · "}
                <Link href="/dashboard/incidents" className="hover:underline">Alle avvik</Link>
              </p>
            )}
          </div>
          <PageHelpDialog content={helpContent.incidents} />
        </div>
        <div className="page-header-actions">
          <UploadIncidentDialog />
          <Button asChild>
            <Link href="/dashboard/incidents/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.reportIncident")}
            </Link>
          </Button>
        </div>
      </div>

      {showCreateOnlyNotice && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <Send className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            Du kan rapportere avvik, men har ikke tilgang til å se innsendte avvik. Avvik du sender inn behandles av HMS-ansvarlig eller administrator.
          </AlertDescription>
        </Alert>
      )}
      {showOwnOnlyNotice && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            Du ser kun dine egne innsendte avvik. Avvik du rapporterer behandles av HMS-ansvarlig eller leder.
          </AlertDescription>
        </Alert>
      )}

      <IncidentsContent initialData={initialIncidents} kilde={kilde} />

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">{t("iso.title")}</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">{t("iso.organizationShould")}</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t("iso.organizationList.react")}</li>
              <li>{t("iso.organizationList.assess")}</li>
              <li>{t("iso.organizationList.implement")}</li>
              <li>{t("iso.organizationList.review")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t("iso.documentation")}</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t("iso.documentationList.nature")}</li>
              <li>{t("iso.documentationList.results")}</li>
              <li>{t("iso.documentationList.rootCause")}</li>
              <li>{t("iso.documentationList.learning")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
