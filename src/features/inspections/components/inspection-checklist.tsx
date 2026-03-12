"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type ChecklistEntry =
  | { type: "heading"; title: string }
  | { type: "item"; title: string; checked: boolean };

interface InspectionChecklistProps {
  inspectionId: string;
  checklist: unknown;
}

function normalizeChecklistEntries(checklist: unknown): ChecklistEntry[] {
  if (!checklist || typeof checklist !== "object") return [];
  const rawItems = (checklist as { items?: unknown[] }).items;
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((entry): ChecklistEntry | null => {
      if (typeof entry === "string") {
        return { type: "item", title: entry, checked: false };
      }

      if (!entry || typeof entry !== "object") {
        return null;
      }

      const typed = entry as { type?: string; title?: string; checked?: boolean };
      const title = String(typed.title || "").trim();
      if (!title) return null;

      if (typed.type === "heading") {
        return { type: "heading", title };
      }

      return {
        type: "item",
        title,
        checked: typed.checked === true,
      };
    })
    .filter((entry): entry is ChecklistEntry => entry !== null);
}

export function InspectionChecklist({ inspectionId, checklist }: InspectionChecklistProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<ChecklistEntry[]>(() => normalizeChecklistEntries(checklist));

  const progress = useMemo(() => {
    const checklistItems = entries.filter((entry): entry is Extract<ChecklistEntry, { type: "item" }> => entry.type === "item");
    const total = checklistItems.length;
    const completed = checklistItems.filter((item) => item.checked).length;
    return { total, completed };
  }, [entries]);

  const toggleItem = (index: number, checked: boolean) => {
    setEntries((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== index || entry.type !== "item") return entry;
        return { ...entry, checked };
      })
    );
  };

  const saveChecklist = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist: {
            items: entries,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke lagre sjekkliste");
      }
      toast({
        title: "Sjekkliste lagret",
        description: "Avhukingene er lagret på vernerunden.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke lagre sjekklisten.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Ingen sjekkpunkter i denne malen.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ferdig: {progress.completed} av {progress.total} sjekkpunkter.
      </p>
      <div className="space-y-2 rounded border p-3">
        {entries.map((entry, index) =>
          entry.type === "heading" ? (
            <p key={`heading-${index}`} className="pt-2 text-sm font-semibold">
              {entry.title}
            </p>
          ) : (
            <div key={`item-${index}`} className="flex items-start gap-2">
              <Checkbox checked={entry.checked} onCheckedChange={(value) => toggleItem(index, value === true)} />
              <span className="text-sm">{entry.title}</span>
            </div>
          )
        )}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={saveChecklist} disabled={saving}>
          {saving ? "Lagrer..." : "Lagre sjekkliste"}
        </Button>
      </div>
    </div>
  );
}
