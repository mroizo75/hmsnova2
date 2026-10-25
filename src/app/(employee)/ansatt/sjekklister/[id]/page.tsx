import { notFound, redirect } from "next/navigation";
import { ChecklistFill } from "@/features/checklists/components/checklist-fill";
import { fetchChecklistFill } from "@/server/queries/checklist.queries";

export default async function EmployeeFillChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checklist = await fetchChecklistFill(id);
  if (checklist === "denied") redirect("/ansatt/sjekklister");
  if (!checklist) notFound();

  return (
    <ChecklistFill
      checklist={checklist}
      resultHref={(runId) => `/ansatt/sjekklister/${id}/resultat/${runId}`}
    />
  );
}
