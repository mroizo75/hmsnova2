import { redirect } from "next/navigation";
import { ChecklistBuilder } from "@/features/checklists/components/checklist-builder";
import { fetchChecklistBuilder } from "@/server/queries/checklist.queries";

export default async function NewChecklistPage() {
  const data = await fetchChecklistBuilder();
  if (!data) redirect("/dashboard/sjekklister");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Ny sjekkliste</h1>
        <p className="mt-1 text-muted-foreground">Lag punktene, velg hvem som har tilgang, og hvem som får svaret.</p>
      </div>
      <ChecklistBuilder initial={data} />
    </div>
  );
}
