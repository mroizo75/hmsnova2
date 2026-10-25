import { notFound, redirect } from "next/navigation";
import { ChecklistResult } from "@/features/checklists/components/checklist-result";
import { fetchChecklistRun } from "@/server/queries/checklist.queries";

export default async function EmployeeChecklistResultPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;
  const run = await fetchChecklistRun(id, runId);
  if (run === "denied") redirect("/ansatt/sjekklister");
  if (!run) notFound();

  return <ChecklistResult run={run} backHref="/ansatt/sjekklister" />;
}