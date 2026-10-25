import { redirect } from "next/navigation";
import { ChecklistBuilder } from "@/features/checklists/components/checklist-builder";
import { fetchChecklistBuilder } from "@/server/queries/checklist.queries";

export default async function EditChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchChecklistBuilder(id);
  if (!data) redirect("/dashboard/sjekklister");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Rediger sjekkliste</h1>
        <p className="mt-1 text-muted-foreground">Tidligere innsendinger beholder teksten slik den var da de ble sendt inn.</p>
      </div>
      <ChecklistBuilder initial={data} />
    </div>
  );
}
