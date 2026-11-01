"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { submitChecklistRun, uploadChecklistPhoto } from "@/server/actions/checklist.actions";
import type { ChecklistResponseValue } from "@/features/checklists/lib/checklist-access";
import type { ChecklistFillData } from "@/server/queries/checklist.queries";

type PointPhoto = { fileKey: string; fileName: string; mimeType: string; previewUrl: string };
type PointAnswer = {
  response: ChecklistResponseValue;
  comment: string;
  reportIncident: boolean;
  photos: PointPhoto[];
};

const CHOICES: Array<{ value: ChecklistResponseValue; label: string; selected: string }> = [
  { value: "OK", label: "OK", selected: "border-emerald-700 bg-emerald-50 text-emerald-950" },
  { value: "DEVIATION", label: "Avvik", selected: "border-amber-700 bg-amber-50 text-amber-950" },
  { value: "NOT_APPLICABLE", label: "Ikke aktuelt", selected: "border-foreground bg-muted text-foreground" },
];

export function ChecklistFill({
  checklist,
  resultHref,
}: {
  checklist: ChecklistFillData;
  resultHref: (runId: string) => string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [location, setLocation] = useState("");
  const [projectId, setProjectId] = useState("");
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, PointAnswer>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const items = useMemo(
    () => checklist.sections.flatMap((section) => section.items),
    [checklist.sections],
  );
  const required = items.filter((item) => item.required);
  const answeredRequired = required.filter((item) => answers[item.id]?.response).length;
  const missingComment = items.some(
    (item) => answers[item.id]?.response === "DEVIATION" && !answers[item.id]?.comment.trim(),
  );
  const ready = answeredRequired === required.length && !missingComment && items.length > 0;

  function setResponse(itemId: string, response: ChecklistResponseValue) {
    setAnswers((current) => ({
      ...current,
      [itemId]: {
        response,
        comment: current[itemId]?.comment ?? "",
        reportIncident:
          response === "DEVIATION"
            ? current[itemId]?.response === "DEVIATION"
              ? current[itemId].reportIncident
              : checklist.canReportIncident
            : false,
        photos: current[itemId]?.photos ?? [],
      },
    }));
  }

  function patchAnswer(itemId: string, patch: Partial<PointAnswer>) {
    setAnswers((current) => {
      const existing = current[itemId];
      if (!existing) return current;
      return { ...current, [itemId]: { ...existing, ...patch } };
    });
  }

  async function addPhotos(itemId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = 4 - (answers[itemId]?.photos.length ?? 0);
    const selected = Array.from(files).slice(0, room);
    setUploadingId(itemId);
    try {
      for (const file of selected) {
        const form = new FormData();
        form.set("file", file);
        const result = await uploadChecklistPhoto(form);
        if (!result.success) {
          toast({ title: "Bildet ble ikke lagt til", description: result.error, variant: "destructive" });
          continue;
        }
        const photo: PointPhoto = { ...result.photo, previewUrl: URL.createObjectURL(file) };
        setAnswers((current) => {
          const existing = current[itemId];
          if (!existing) return current;
          return { ...current, [itemId]: { ...existing, photos: [...existing.photos, photo].slice(0, 4) } };
        });
      }
    } finally {
      setUploadingId(null);
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await submitChecklistRun({
        checklistId: checklist.id,
        location,
        projectId,
        note,
        answers: items
          .filter((item) => answers[item.id]?.response)
          .map((item) => ({
            itemId: item.id,
            response: answers[item.id].response,
            comment: answers[item.id].comment,
            reportIncident: answers[item.id].reportIncident,
            photos: answers[item.id].photos.map(({ fileKey, fileName, mimeType }) => ({
              fileKey,
              fileName,
              mimeType,
            })),
          })),
      });
      if (!result.success) {
        toast({ title: "Kunne ikke sende inn", description: result.error, variant: "destructive" });
        return;
      }
      router.push(resultHref(result.runId));
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Sjekkliste</p>
        <h1 className="text-3xl font-semibold tracking-tight">{checklist.title}</h1>
        {checklist.usageNote && (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6">{checklist.usageNote}</p>
        )}
        {checklist.description && <p className="text-sm leading-6 text-muted-foreground">{checklist.description}</p>}
      </header>

      <div className="sticky top-0 z-20 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {answeredRequired} av {required.length} obligatoriske
          </span>
          <span className="text-muted-foreground">{items.length} punkter</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${required.length === 0 ? 0 : (answeredRequired / required.length) * 100}%` }}
          />
        </div>
      </div>

      {checklist.projects.length > 0 && (
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Prosjekt</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm text-foreground"
          >
            <option value="">Ikke knyttet til prosjekt</option>
            {checklist.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code ? `${project.name} (${project.code})` : project.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Hvor ble kontrollen gjort?</span>
        <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Avdeling eller sted" />
      </label>

      {checklist.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.items.map((item, index) => {
            const answer = answers[item.id];
            return (
              <article key={item.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium leading-6">
                      <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                      {item.prompt}
                    </p>
                    {item.helpText && <p className="mt-1 text-sm text-muted-foreground">{item.helpText}</p>}
                  </div>
                  {!item.required && <span className="shrink-0 text-xs text-muted-foreground">Valgfritt</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {CHOICES.map((choice) => {
                    const selected = answer?.response === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => setResponse(item.id, choice.value)}
                        className={`min-h-12 rounded-xl border px-2 text-sm font-medium ${
                          selected ? choice.selected : "border-border bg-transparent text-foreground"
                        }`}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
                {answer?.response === "DEVIATION" && (
                  <div className="mt-3 space-y-3">
                    <label className="block space-y-1.5 text-sm">
                      <span className="font-medium">Hva er galt?</span>
                      <Textarea
                        value={answer.comment}
                        onChange={(event) => patchAnswer(item.id, { comment: event.target.value })}
                        placeholder="Beskriv avviket slik at mottakeren kan følge det opp"
                        className="min-h-24"
                      />
                    </label>
                    {checklist.canReportIncident && (
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={answer.reportIncident}
                          onChange={(event) => patchAnswer(item.id, { reportIncident: event.target.checked })}
                        />
                        <span>
                          <span className="font-medium">Meld dette som avvik</span>
                          <span className="mt-0.5 block text-muted-foreground">
                            Oppretter et avvik som kan følges opp, med spor tilbake til dette punktet.
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                )}
                {answer?.response && answer.response !== "DEVIATION" && (
                  <label className="mt-3 block space-y-1.5 text-sm">
                    <span className="text-muted-foreground">Kommentar, valgfritt</span>
                    <Input
                      value={answer.comment}
                      onChange={(event) => patchAnswer(item.id, { comment: event.target.value })}
                      placeholder="Legg til hvis det er noe mottakeren bør vite"
                    />
                  </label>
                )}
                {answer?.response && (
                  <div className="mt-3 space-y-2">
                    {answer.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {answer.photos.map((photo) => (
                          <div key={photo.fileKey} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.previewUrl} alt={photo.fileName} className="h-16 w-16 rounded-lg object-cover" />
                            <button
                              type="button"
                              className="absolute -right-1 -top-1 rounded-full bg-background px-1.5 text-xs"
                              onClick={() =>
                                patchAnswer(item.id, {
                                  photos: answer.photos.filter((current) => current.fileKey !== photo.fileKey),
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {answer.photos.length < 4 && (
                      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-border bg-transparent px-3 text-sm text-foreground">
                        {uploadingId === item.id ? "Laster opp…" : "Legg til bilde"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          className="sr-only"
                          disabled={uploadingId === item.id}
                          onChange={(event) => {
                            void addPhotos(item.id, event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Merknad til hele sjekklisten</span>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Valgfritt" className="min-h-24" />
      </label>

      <div className="sticky bottom-4 rounded-2xl border bg-background/95 p-3 shadow-lg">
        {!ready && (
          <p className="mb-2 text-sm text-muted-foreground">
            Besvar alle obligatoriske punkter. Avvik trenger en forklaring.
          </p>
        )}
        <Button type="button" className="w-full" disabled={!ready || pending} onClick={submit}>
          {pending ? "Sender inn…" : "Send inn sjekkliste"}
        </Button>
      </div>
    </div>
  );
}
