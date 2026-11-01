import Link from "next/link";
import { responseLabel } from "@/features/checklists/lib/checklist-access";
import type { ChecklistRunView } from "@/server/queries/checklist.queries";

function formatWhen(value: string) {
  return new Date(value).toLocaleString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChecklistResult({
  run,
  backHref,
  incidentHref,
}: {
  run: ChecklistRunView;
  backHref: string;
  incidentHref: (incidentId: string) => string;
}) {
  const total = run.okCount + run.deviationCount + run.notApplicableCount;
  const deviations = run.answers.filter((answer) => answer.response === "DEVIATION");
  const sections = [...new Set(run.answers.map((answer) => answer.sectionTitle))];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          Tilbake til sjekklisten
        </Link>
        <p className="mt-3 text-sm font-medium text-muted-foreground">{run.reference}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{run.checklistTitle}</h1>
      </div>

      <section
        className={`rounded-3xl border p-6 ${
          run.deviationCount > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
        }`}
      >
        <p className="text-sm font-medium">{run.deviationCount > 0 ? "Avvik som må følges opp" : "Ingen avvik"}</p>
        <p className="mt-2 text-5xl font-semibold tracking-tight">{run.deviationCount}</p>
        <p className="mt-2 text-sm">
          {run.okCount} OK · {run.notApplicableCount} ikke aktuelt · {total} punkter besvart
        </p>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <Info label="Utført av" value={run.submittedByName} />
        <Info label="Tidspunkt" value={formatWhen(run.submittedAt)} />
        <Info label="Prosjekt" value={run.projectName || "Ikke knyttet til prosjekt"} />
        <Info label="Sted" value={run.location || "Ikke oppgitt"} />
        <Info label="Resultat sendt til" value={run.recipients.length > 0 ? run.recipients.join(", ") : "Ingen mottakere"} />
        {run.note && (
          <div className="sm:col-span-2">
            <Info label="Merknad" value={run.note} />
          </div>
        )}
      </section>

      {deviations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Avvikene</h2>
          {deviations.map((answer, index) => (
            <article key={`${answer.sectionTitle}-${index}`} className="rounded-2xl border border-amber-300 bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{answer.sectionTitle}</p>
              <p className="mt-1 font-medium">{answer.prompt}</p>
              <p className="mt-2 text-sm leading-6">{answer.comment}</p>
              <AnswerPhotos photos={answer.photos} />
              {answer.incident && (
                <Link href={incidentHref(answer.incident.id)} className="mt-3 inline-block text-sm font-medium underline">
                  Avvik {answer.incident.avviksnummer ?? "åpne saken"}
                </Link>
              )}
            </article>
          ))}
        </section>
      )}

      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Hele sjekklisten</h2>
        {sections.map((section) => (
          <div key={section} className="space-y-2">
            <h3 className="text-sm font-semibold">{section}</h3>
            {run.answers
              .filter((answer) => answer.sectionTitle === section)
              .map((answer, index) => (
                <div key={`${section}-${index}`} className="flex items-start justify-between gap-4 rounded-xl border px-3 py-3">
                  <div>
                    <p className="text-sm">{answer.prompt}</p>
                    {answer.comment && answer.response !== "DEVIATION" && (
                      <p className="mt-1 text-sm text-muted-foreground">{answer.comment}</p>
                    )}
                    <AnswerPhotos photos={answer.photos} />
                    {answer.incident && (
                      <Link href={incidentHref(answer.incident.id)} className="mt-2 inline-block text-sm font-medium underline">
                        Avvik {answer.incident.avviksnummer ?? "åpne saken"}
                      </Link>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      answer.response === "OK"
                        ? "bg-emerald-100 text-emerald-950"
                        : answer.response === "DEVIATION"
                          ? "bg-amber-100 text-amber-950"
                          : "bg-muted text-foreground"
                    }`}
                  >
                    {responseLabel(answer.response)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </section>
    </div>
  );
}

function AnswerPhotos({ photos }: { photos: Array<{ fileKey: string; fileName: string }> }) {
  if (photos.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {photos.map((photo) => (
        <a key={photo.fileKey} href={`/api/files/${photo.fileKey}`} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${photo.fileKey}`} alt={photo.fileName} className="h-20 w-20 rounded-lg object-cover" />
        </a>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6">{value}</p>
    </div>
  );
}
