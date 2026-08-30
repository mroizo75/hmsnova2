import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import Link from "next/link";
import { ChevronLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAbsenceStats } from "@/server/queries/absence.queries";
import { AbsenceStatsDashboard } from "@/features/absence/components/absence-stats-dashboard";

export default async function FravaerStatistikkPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canExportAbsenceStats) redirect("/dashboard/fravaer");

  const stats = await fetchAbsenceStats();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/fravaer">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Fraværsstatistikk
        </h1>
        <p className="text-muted-foreground mt-1">
          Sykefraværsstatistikk og trender – AML § 5-1 (4)
        </p>
      </div>

      <AbsenceStatsDashboard stats={stats as any} />
    </div>
  );
}
