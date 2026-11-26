"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { reportOwnMeasureProgress } from "@/server/actions/measure.actions";

export function OwnMeasureProgress({
  measureId,
  status,
}: {
  measureId: string;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (status === "DONE") return null;

  async function save(nextStatus: "IN_PROGRESS" | "DONE") {
    setSaving(true);
    const result = await reportOwnMeasureProgress({
      id: measureId,
      status: nextStatus,
      note,
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
      return;
    }
    toast({ title: nextStatus === "DONE" ? "Tiltaket er fullført" : "Tiltaket er satt til pågår" });
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="measure-note">Hva er gjort</Label>
        <Textarea
          id="measure-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Kort beskrivelse når tiltaket fullføres"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {status !== "IN_PROGRESS" && (
          <Button type="button" variant="outline" disabled={saving} onClick={() => save("IN_PROGRESS")}>
            Sett til pågår
          </Button>
        )}
        <Button type="button" disabled={saving} onClick={() => save("DONE")}>
          Marker som fullført
        </Button>
      </div>
    </div>
  );
}
