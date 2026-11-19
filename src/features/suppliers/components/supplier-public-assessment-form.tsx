"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SupplierQuestion } from "@/lib/supplier-management";

export function SupplierPublicAssessmentForm({
  token,
  questions,
}: {
  token: string;
  questions: SupplierQuestion[];
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/leverandor-vurdering/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondentName: String(formData.get("respondentName") ?? ""),
          respondentEmail: String(formData.get("respondentEmail") ?? ""),
          answers: questions.map((question) => ({
            questionId: question.id,
            value: String(formData.get(question.id) ?? ""),
          })),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Kunne ikke sende");
        return;
      }
      setDone(true);
    } catch {
      setError("Kunne ikke sende");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return <p className="mt-8 text-sm">Takk. Svaret er registrert.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="respondentName">Navn</Label>
          <Input id="respondentName" name="respondentName" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="respondentEmail">E-post</Label>
          <Input id="respondentEmail" name="respondentEmail" type="email" required />
        </div>
      </div>
      {questions.map((question) => (
        <div key={question.id} className="space-y-2">
          <Label htmlFor={question.id}>
            {question.label}
            {question.required ? "" : " (valgfritt)"}
          </Label>
          {question.helpText ? <p className="text-xs text-muted-foreground">{question.helpText}</p> : null}
          {question.fieldType === "YES_NO" ? (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name={question.id} value="Ja" required={question.required} /> Ja
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name={question.id} value="Nei" /> Nei
              </label>
            </div>
          ) : null}
          {question.fieldType === "TEXT" ? (
            <Input id={question.id} name={question.id} required={question.required} maxLength={8000} />
          ) : null}
          {question.fieldType === "TEXTAREA" ? (
            <Textarea id={question.id} name={question.id} required={question.required} rows={3} maxLength={8000} />
          ) : null}
        </div>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sender…" : "Send svar"}
      </Button>
    </form>
  );
}
