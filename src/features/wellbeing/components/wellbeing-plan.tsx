"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { closeWellbeingRound, startWellbeingRound } from "@/server/actions/wellbeing-round.actions";

type FormOption = { id: string; title: string };
type EmployeeOption = { userId: string; name: string };
type Assignment = {
  id: string;
  status: "PENDING" | "ANSWERED";
  round: {
    id: string;
    title: string;
    message: string | null;
    dueDate: string | null;
    formTemplateId: string;
    formTitle: string;
  };
};
type RoundRow = {
  id: string;
  title: string;
  status: "ACTIVE" | "CLOSED";
  dueDate: string | null;
  answered: number;
  total: number;
  pendingNames: string[];
};

export function WellbeingPlan({
  canStart,
  forms,
  employees,
  assignments,
  rounds,
}: {
  canStart: boolean;
  forms: FormOption[];
  employees: EmployeeOption[];
  assignments: Assignment[];
  rounds: RoundRow[];
}) {
  const router = useRouter();
  const [formTemplateId, setFormTemplateId] = useState(forms[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [allEmployees, setAllEmployees] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const waiting = assignments.filter((item) => item.status === "PENDING");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Til deg</CardTitle>
          <CardDescription>
            Kartleggingen sendes av bedriften. Svaret lagres uten navn. At du har svart, vises for den som sendte den.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen kartlegging venter på deg.</p>
          ) : (
            <ul className="divide-y">
              {waiting.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.round.title}</p>
                    <p className="text-sm text-muted-foreground">{item.round.formTitle}</p>
                    {item.round.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Svar innen {format(new Date(item.round.dueDate), "d. MMM yyyy", { locale: nb })}
                      </p>
                    )}
                  </div>
                  <Button asChild>
                    <Link href={`/dashboard/wellbeing/${item.round.formTemplateId}/fill?runde=${item.round.id}`}>
                      Svar
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canStart && (
        <Card>
          <CardHeader>
            <CardTitle>Send kartlegging</CardTitle>
            <CardDescription>
              Administrator, HR eller HMS velger skjema og hvem som skal svare. Skjema som er laget for denne bedriften, ligger i listen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {forms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen skjema er aktivert. HMS Nova lager skjemaet for bedriften.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="wellbeing-form">Skjema</Label>
                    <select
                      id="wellbeing-form"
                      className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
                      value={formTemplateId}
                      onChange={(event) => setFormTemplateId(event.target.value)}
                    >
                      {forms.map((form) => (
                        <option key={form.id} value={form.id}>
                          {form.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wellbeing-due">Frist (valgfritt)</Label>
                    <Input id="wellbeing-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="wellbeing-title">Tittel i varselet</Label>
                    <Input
                      id="wellbeing-title"
                      value={title}
                      placeholder="For eksempel arbeidsmiljø høsten 2026"
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="wellbeing-message">Melding (valgfritt)</Label>
                    <Textarea id="wellbeing-message" value={message} onChange={(event) => setMessage(event.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allEmployees}
                    onChange={(event) => setAllEmployees(event.target.checked)}
                  />
                  Alle ansatte
                </label>
                {!allEmployees && (
                  <select
                    multiple
                    className="min-h-32 w-full rounded-md border bg-transparent p-2 text-sm"
                    value={selected}
                    onChange={(event) =>
                      setSelected([...event.target.selectedOptions].map((option) => option.value))
                    }
                  >
                    {employees.map((employee) => (
                      <option key={employee.userId} value={employee.userId}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  disabled={pending}
                  onClick={async () => {
                    setPending(true);
                    setError(null);
                    const result = await startWellbeingRound({
                      formTemplateId,
                      title: title || forms.find((form) => form.id === formTemplateId)?.title || "Kartlegging",
                      message,
                      dueDate,
                      userIds: allEmployees ? [] : selected,
                    });
                    setPending(false);
                    if (!result.success) {
                      setError(result.error);
                      return;
                    }
                    setTitle("");
                    setMessage("");
                    router.refresh();
                  }}
                >
                  {pending ? "Sender…" : "Send til ansatte"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {canStart && rounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Utsendte kartlegginger</CardTitle>
            <CardDescription>Antall som har svart. Innholdet i svarene er ikke koblet til person.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {rounds.map((round) => (
                <li key={round.id} className="space-y-2 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{round.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {round.answered} av {round.total} har svart
                        {round.status === "CLOSED" ? " · avsluttet" : ""}
                      </p>
                    </div>
                    {round.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        className="bg-transparent"
                        onClick={async () => {
                          const result = await closeWellbeingRound({ id: round.id });
                          if (!result.success) setError(result.error);
                          else router.refresh();
                        }}
                      >
                        Avslutt
                      </Button>
                    )}
                  </div>
                  {round.status === "ACTIVE" && round.pendingNames.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Ikke svart: {round.pendingNames.join(", ")}
                      {round.total - round.answered > round.pendingNames.length ? " …" : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
