"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SatisfactionForm({ token }: { token: string }) {
  const [rating, setRating] = useState(5);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/tilfredshet/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          summary: String(formData.get("summary") ?? ""),
          customerName: String(formData.get("customerName") ?? ""),
          customerCompany: String(formData.get("customerCompany") ?? ""),
          contactEmail: String(formData.get("contactEmail") ?? ""),
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
    return <p className="mt-8 text-sm">Takk. Tilbakemeldingen er registrert.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div className="space-y-2">
        <Label>Vurdering</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`h-11 w-11 rounded-md border text-sm ${
                rating === value ? "border-primary bg-primary text-primary-foreground" : "bg-transparent"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">1 er dårlig, 5 er svært bra.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Hva vil du fortelle oss?</Label>
        <Textarea id="summary" name="summary" required minLength={5} rows={4} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerName">Navn (valgfritt)</Label>
        <Input id="customerName" name="customerName" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerCompany">Bedrift (valgfritt)</Label>
        <Input id="customerCompany" name="customerCompany" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactEmail">E-post (valgfritt)</Label>
        <Input id="contactEmail" name="contactEmail" type="email" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sender…" : "Send"}
      </Button>
    </form>
  );
}
