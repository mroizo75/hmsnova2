import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { ChecklistOverview } from "@/features/checklists/components/checklist-overview";
import { fetchChecklistOverview } from "@/server/queries/checklist.queries";

export default async function ChecklistsPage() {
  const data = await fetchChecklistOverview();
  if (!data) redirect("/login");
  if (data.denied) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Sjekklister</h1>
            <p className="mt-1 max-w-xl text-muted-foreground">
              Bygg kontrollene bedriften faktisk bruker. Velg hvem som fyller ut, og hvem som får resultatet.
            </p>
          </div>
          <PageHelpDialog content={helpContent.checklists} />
        </div>
        {data.canManage && (
          <Button asChild>
            <Link href="/dashboard/sjekklister/ny">
              <Plus className="mr-2 h-4 w-4" />
              Ny sjekkliste
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Aktive</p>
          <p className="mt-1 text-3xl font-semibold">{data.activeCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Avvik siste 30 dager</p>
          <p className="mt-1 text-3xl font-semibold">{data.deviationCount}</p>
        </div>
      </div>

      <ChecklistOverview
        items={data.items}
        recentRuns={data.recentRuns}
        canManage={data.canManage}
        basePath="/dashboard/sjekklister"
      />
    </div>
  );
}
