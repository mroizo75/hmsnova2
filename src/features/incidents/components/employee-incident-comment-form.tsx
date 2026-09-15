"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { addIncidentComment } from "@/server/actions/incident-comment.actions";

export function EmployeeIncidentCommentForm({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const result = await addIncidentComment({
      incidentId,
      body,
      kind: "SUBMITTER",
    });
    setSaving(false);
    if (result.success === false) {
      toast({ title: "Kunne ikke lagre", description: result.error, variant: "destructive" });
      return;
    }
    setBody("");
    toast({ title: "Kommentar sendt" });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Skriv en kommentar til behandler..."
        rows={3}
      />
      <Button type="button" onClick={handleSubmit} disabled={saving || body.trim().length < 2}>
        {saving ? "Sender..." : "Send kommentar"}
      </Button>
    </div>
  );
}
