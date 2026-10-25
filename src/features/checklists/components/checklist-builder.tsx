"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { saveChecklist } from "@/server/actions/checklist.actions";
import { CHECKLIST_STARTERS } from "@/features/checklists/lib/checklist-starters";
import type { ChecklistAccessMode } from "@/features/checklists/lib/checklist-access";
import type { ChecklistBuilderData } from "@/server/queries/checklist.queries";

interface SectionDraft {
  title: string;
  items: Array<{ prompt: string; helpText: string; required: boolean }>;
}

const ACCESS_OPTIONS: Array<{ value: ChecklistAccessMode; title: string; text: string }> = [
  { value: "ALL", title: "Alle i bedriften", text: "Alle som kan fylle ut sjekklister." },
  { value: "ROLES", title: "Utvalgte roller", text: "Bare valgte roller ser og fyller ut." },
  { value: "USERS", title: "Utvalgte personer", text: "Bare personene du velger." },
  { value: "ROLES_AND_USERS", title: "Roller og personer", text: "Begge listene får tilgang." },
];

export function ChecklistBuilder({ initial }: { initial: ChecklistBuilderData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [usageNote, setUsageNote] = useState(initial.usageNote);
  const [access, setAccess] = useState<ChecklistAccessMode>(initial.access);
  const [allowedRoles, setAllowedRoles] = useState(initial.allowedRoles);
  const [allowedUserIds, setAllowedUserIds] = useState(initial.allowedUserIds);
  const [resultRecipientIds, setResultRecipientIds] = useState(initial.resultRecipientIds);
  const [sections, setSections] = useState<SectionDraft[]>(initial.sections);
  const [personQuery, setPersonQuery] = useState("");

  const people = initial.members.filter((member) => {
    const query = personQuery.trim().toLowerCase();
    if (!query) return true;
    return member.name.toLowerCase().includes(query) || member.roleLabel.toLowerCase().includes(query);
  });

  function toggle(list: string[], value: string, setList: (next: string[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function updateSection(index: number, patch: Partial<SectionDraft>) {
    setSections((current) => current.map((section, i) => (i === index ? { ...section, ...patch } : section)));
  }

  function applyStarter(starterId: string) {
    const starter = CHECKLIST_STARTERS.find((item) => item.id === starterId);
    if (!starter) return;
    const hasContent = sections.some((section) => section.items.some((item) => item.prompt.trim()));
    if (hasContent && !window.confirm("Eksempelet erstatter punktene du har skrevet.")) return;
    setTitle(starter.title);
    setDescription(starter.description);
    setUsageNote(starter.usageNote);
    setSections(starter.sections.map((section) => ({ ...section, items: section.items.map((item) => ({ ...item })) })));
  }

  function save(status: "DRAFT" | "ACTIVE") {
    startTransition(async () => {
      const result = await saveChecklist({
        id: initial.id,
        title,
        description,
        usageNote,
        status,
        access,
        allowedRoles,
        allowedUserIds,
        resultRecipientIds,
        sections,
      });
      if (!result.success) {
        toast({ title: "Kunne ikke lagre", description: result.error, variant: "destructive" });
        return;
      }
      toast({
        title: status === "ACTIVE" ? "Sjekklisten er publisert" : "Kladd lagret",
        description: status === "ACTIVE" ? "De med tilgang kan fylle den ut nå." : "Den er ikke synlig for ansatte ennå.",
      });
      router.push(`/dashboard/sjekklister/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Om sjekklisten</h2>
            <p className="mt-1 text-sm text-muted-foreground">Navn og når den skal brukes.</p>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Navn</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="F.eks. Daglig oppstart" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Når skal den brukes?</span>
            <Textarea
              value={usageNote}
              onChange={(event) => setUsageNote(event.target.value)}
              placeholder="F.eks. før arbeidet starter hver morgen"
              className="min-h-20"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Kort beskrivelse</span>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Valgfritt. Vises på oversikten."
              className="min-h-20"
            />
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Hvem kan fylle ut?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Andre ser ikke sjekklisten.</p>
          </div>
          <div className="grid gap-2">
            {ACCESS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAccess(option.value)}
                className={`rounded-xl border px-3 py-2.5 text-left ${
                  access === option.value ? "border-primary bg-primary/5" : "border-border bg-transparent"
                }`}
              >
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.text}</span>
              </button>
            ))}
          </div>
          {(access === "ROLES" || access === "ROLES_AND_USERS") && (
            <div className="flex flex-wrap gap-2">
              {initial.roles.map((role) => {
                const selected = allowedRoles.includes(role.value);
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => toggle(allowedRoles, role.value, setAllowedRoles)}
                    className={`min-h-11 rounded-full border px-3 text-sm ${
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
                    }`}
                  >
                    {role.label}
                  </button>
                );
              })}
            </div>
          )}
          {(access === "USERS" || access === "ROLES_AND_USERS") && (
            <PersonPicker
              query={personQuery}
              onQuery={setPersonQuery}
              people={people}
              selected={allowedUserIds}
              onToggle={(id) => toggle(allowedUserIds, id, setAllowedUserIds)}
            />
          )}
        </section>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Hvem får resultatet?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              De varsles når sjekklisten sendes inn, og kan lese svaret. Den som fylte ut ser alltid sitt eget.
            </p>
          </div>
          <PersonPicker
            query={personQuery}
            onQuery={setPersonQuery}
            people={people}
            selected={resultRecipientIds}
            onToggle={(id) => toggle(resultRecipientIds, id, setResultRecipientIds)}
          />
        </section>
      </aside>

      <div className="space-y-4">
        {!initial.id && (
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Start fra et eksempel</h2>
            <p className="mt-1 text-sm text-muted-foreground">Du kan endre alt etterpå.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CHECKLIST_STARTERS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  onClick={() => applyStarter(starter.id)}
                  className="rounded-xl border border-border bg-transparent px-3 py-3 text-left hover:bg-muted"
                >
                  <span className="block text-sm font-medium">{starter.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{starter.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="space-y-3 rounded-2xl border bg-card p-4">
            <div className="flex items-start gap-2">
              <label className="block min-w-0 flex-1 space-y-1.5 text-sm">
                <span className="font-medium">Bolk {sectionIndex + 1}</span>
                <Input
                  value={section.title}
                  onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                  placeholder="F.eks. Før arbeidet starter"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                className="mt-6 bg-transparent"
                disabled={sections.length === 1}
                onClick={() => setSections((current) => current.filter((_, index) => index !== sectionIndex))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <Input
                      value={item.prompt}
                      onChange={(event) => {
                        const items = section.items.map((current, index) =>
                          index === itemIndex ? { ...current, prompt: event.target.value } : current,
                        );
                        updateSection(sectionIndex, { items });
                      }}
                      placeholder="Hva skal kontrolleres?"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      disabled={section.items.length === 1}
                      onClick={() =>
                        updateSection(sectionIndex, {
                          items: section.items.filter((_, index) => index !== itemIndex),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.helpText}
                    onChange={(event) => {
                      const items = section.items.map((current, index) =>
                        index === itemIndex ? { ...current, helpText: event.target.value } : current,
                      );
                      updateSection(sectionIndex, { items });
                    }}
                    placeholder="Hjelpetekst, valgfritt"
                    className="mt-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const items = section.items.map((current, index) =>
                        index === itemIndex ? { ...current, required: !current.required } : current,
                      );
                      updateSection(sectionIndex, { items });
                    }}
                    className={`mt-2 min-h-11 rounded-full border px-3 text-xs ${
                      item.required ? "border-primary bg-primary/5 text-foreground" : "border-border bg-transparent text-muted-foreground"
                    }`}
                  >
                    {item.required ? "Må besvares" : "Kan hoppes over"}
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="bg-transparent"
              onClick={() =>
                updateSection(sectionIndex, {
                  items: [...section.items, { prompt: "", helpText: "", required: true }],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Nytt punkt
            </Button>
          </section>
        ))}

        <Button
          type="button"
          variant="outline"
          className="bg-transparent"
          onClick={() =>
            setSections((current) => [
              ...current,
              { title: "", items: [{ prompt: "", helpText: "", required: true }] },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Ny bolk
        </Button>

        <div className="sticky bottom-4 flex flex-col gap-2 rounded-2xl border bg-background/95 p-3 shadow-lg sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="bg-transparent" disabled={pending} onClick={() => save("DRAFT")}>
            Lagre kladd
          </Button>
          <Button type="button" disabled={pending} onClick={() => save("ACTIVE")}>
            {pending ? "Lagrer…" : "Publiser"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PersonPicker({
  query,
  onQuery,
  people,
  selected,
  onToggle,
}: {
  query: string;
  onQuery: (value: string) => void;
  people: ChecklistBuilderData["members"];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Søk etter person" />
      <div className="max-h-52 space-y-1 overflow-auto">
        {people.length === 0 && <p className="px-1 text-sm text-muted-foreground">Ingen treff.</p>}
        {people.map((person) => {
          const active = selected.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onToggle(person.id)}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-sm ${
                active ? "border-primary bg-primary/5" : "border-transparent bg-transparent hover:bg-muted"
              }`}
            >
              <span>
                <span className="block font-medium">{person.name}</span>
                <span className="text-xs text-muted-foreground">{person.roleLabel}</span>
              </span>
              <span className="text-xs">{active ? "Valgt" : "Velg"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
