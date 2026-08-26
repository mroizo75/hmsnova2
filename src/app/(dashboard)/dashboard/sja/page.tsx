import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  HardHat,
  Plus,
  Info,
  Send,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchSjaList } from "@/server/queries/sja.queries";
import { SjaListContent } from "@/features/sja/components/sja-list-content";

export default async function SjaDashboardPage() {
  const t = await getTranslations("dashboardSjaPage");

  const auth = await getAuthContext();
  const { permissions, tenantId } = auth;

  const canReadAll  = permissions.canReadSja;
  const canReadOwn  = permissions.canReadOwnSja;
  const canCreate   = permissions.canCreateSja;

  if (!canReadAll && !canReadOwn && !canCreate) {
    redirect("/dashboard");
  }

  const showOwnOnlyNotice = !canReadAll && canReadOwn;
  const showCreateOnlyNotice = !canReadAll && !canReadOwn && canCreate;

  const initialData = await fetchSjaList();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HardHat className="h-8 w-8 text-orange-600" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/sja/new">
            <Plus className="h-4 w-4 mr-1" />
            {t("actions.new")}
          </Link>
        </Button>
      </div>

      {showCreateOnlyNotice && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <Send className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            Du kan opprette SJA-analyser, men har ikke tilgang til å se andres. SJA-er du sender inn behandles og godkjennes av HMS-ansvarlig eller administrator.
          </AlertDescription>
        </Alert>
      )}
      {showOwnOnlyNotice && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            Du ser kun dine egne SJA-analyser. SJA-er du oppretter behandles og godkjennes av leder.
          </AlertDescription>
        </Alert>
      )}

      <SjaListContent initialData={initialData} tenantId={tenantId} />
    </div>
  );
}
