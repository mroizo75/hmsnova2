import { redirect } from "next/navigation";
import { ChecklistOverview } from "@/features/checklists/components/checklist-overview";
import { fetchChecklistOverview } from "@/server/queries/checklist.queries";

export default async function EmployeeChecklistsPage() {
  const data = await fetchChecklistOverview();
  if (!data) redirect("/login");
  if (data.denied) redirect("/ansatt");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sjekklister</h1>
        <p className="mt-1 text-muted-foreground">
          Fyll ut kontrollene bedriften har gitt deg tilgang til. Du ser dine egne innsendinger etterpå.
        </p>
      </div>
      <ChecklistOverview
        items={data.items.filter((item) => item.status === "ACTIVE")}
        recentRuns={data.recentRuns}
        canManage={false}
        basePath="/ansatt/sjekklister"
      />
    </div>
  );
}
