"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aktuelleRutiner, skjenkeProfil } from "@/features/skjenking/lib/internkontroll";
import type { SkjenkeBevillingView, SkjenkeRutineView } from "./skjenking-types";

interface Props {
  bevilling: SkjenkeBevillingView | null;
  rutiner: SkjenkeRutineView[];
  canEdit: boolean;
  onSaved: () => Promise<void>;
}

export function SkjenkingRutiner({ bevilling, rutiner, canEdit, onSaved }: Props) {
  const maler = aktuelleRutiner(skjenkeProfil(bevilling));
  const [drafts, setDrafts] = useState<Record<string, { innhold: string; aktiv: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function draft(nokkel: string, fallback: { innhold: string; aktiv: boolean }) {
    return drafts[nokkel] ?? fallback;
  }

  async function save(nokkel: string, innhold: string, aktiv: boolean) {
    setSaving(nokkel);
    try {
      const res = await fetch("/api/skjenking/rutiner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nokkel, innhold, aktiv }),
      });
      if (!res.ok) throw new Error();
      toast.success("Rutine lagret");
      await onSaved();
    } catch {
      toast.error("Kunne ikke lagre rutinen");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Alkoholforskriften § 8-3 nr. 4 og nr. 5. Standardtekstene kan tilpasses stedet. De skal beskrive hvordan kravene faktisk følges.
      </p>
      {maler.map((mal) => {
        const saved = rutiner.find((row) => row.nokkel === mal.nokkel);
        const value = draft(mal.nokkel, { innhold: saved?.innhold ?? mal.innhold, aktiv: saved?.aktiv ?? true });
        return (
          <section key={mal.nokkel} className="space-y-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{mal.tittel}</h2>
                <p className="text-xs text-muted-foreground">{mal.lovhjemmel}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={value.aktiv}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [mal.nokkel]: { ...value, aktiv: event.target.checked } }))
                  }
                />
                Aktiv
              </label>
            </div>
            <Textarea
              disabled={!canEdit}
              rows={5}
              value={value.innhold}
              onChange={(event) => setDrafts((prev) => ({ ...prev, [mal.nokkel]: { ...value, innhold: event.target.value } }))}
            />
            {canEdit && (
              <Button size="sm" disabled={saving === mal.nokkel} onClick={() => save(mal.nokkel, value.innhold, value.aktiv)}>
                {saving === mal.nokkel ? "Lagrer…" : "Lagre rutine"}
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}
