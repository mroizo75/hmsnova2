import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChecklistManageActions } from "@/features/checklists/components/checklist-manage-actions";
import { fetchChecklistDetail } from "@/server/queries/checklist.queries";

function formatWhen(value: string) {
  return new Date(value).toLocaleString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checklist = await fetchChecklistDetail(id);
  if (!checklist) notFound();
  if (checklist === "denied") redirect("/dashboard/sjekklister");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/sjekklister" className="text-sm text-muted-foreground hover:text-foreground">
            Alle sjekklister
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{checklist.title}</h1>
          {checklist.usageNote && <p className="mt-2 text-muted-foreground">{checklist.usageNote}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {checklist.canFill && (
            <Link
              href={`/dashboard/sjekklister/${checklist.id}/fyll`}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Fyll ut
            </Link>
          )}
          {checklist.canManage && checklist.status !== "ARCHIVED" && (
            <Link
              href={`/dashboard/sjekklister/${checklist.id}/rediger`}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-transparent px-4 text-sm font-medium"
            >
              Rediger
            </Link>
          )}
        </div>
      </div>

      <section className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <Fact label="Status" value={checklist.status === "ACTIVE" ? "Aktiv" : checklist.status === "DRAFT" ? "Kladd" : "Arkivert"} />
        <Fact label="Tilgang" value={checklist.accessLabel} />
        <Fact label="Punkter" value={String(checklist.itemCount)} />
        <Fact label="Opprettet av" value={checklist.createdByName} />
        <div className="sm:col-span-2">
          <Fact
            label="Får resultatet"
            value={checklist.recipients.length > 0 ? checklist.recipients.join(", ") : "Ingen mottakere"}
          />
        </div>
        {checklist.description && (
          <div className="sm:col-span-2">
            <Fact label="Beskrivelse" value={checklist.description} />
          </div>
        )}
      </section>

      {checklist.canManage && <ChecklistManageActions id={checklist.id} status={checklist.status} />}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Innsendinger</h2>
        {checklist.runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen har sendt inn denne sjekklisten ennå.</p>
        ) : (
          <div className="divide-y rounded-2xl border bg-card">
            {checklist.runs.map((run) => (
              <Link
                key={run.id}
                href={`/dashboard/sjekklister/${checklist.id}/innsendinger/${run.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {run.reference}
                    <span className="ml-2 font-normal text-muted-foreground">{run.submittedByName}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatWhen(run.submittedAt)}
                    {run.location ? ` · ${run.location}` : ""}
                  </p>
                </div>
                <p className={`text-sm font-medium ${run.deviationCount > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                  {run.okCount} OK · {run.deviationCount} avvik · {run.notApplicableCount} ikke aktuelt
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}
