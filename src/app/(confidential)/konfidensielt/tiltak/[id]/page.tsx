"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  completeConfidentialMeasure,
  getConfidentialMeasure,
} from "@/server/actions/whistleblowing-access.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ConfidentialMeasurePage() {
  const params = useParams<{ id: string }>();
  const [measure, setMeasure] = useState<{
    id: string;
    title: string;
    description: string;
    status: string;
    dueAt: string | null;
  } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConfidentialMeasure(params.id)
      .then(setMeasure)
      .catch((err) => setError(err instanceof Error ? err.message : "Ingen tilgang"));
  }, [params.id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!measure) return <p className="text-sm text-muted-foreground">Laster…</p>;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{measure.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm">{measure.description}</p>
        {measure.status !== "COMPLETED" && (
          <>
            <Textarea placeholder="Kommentar ved ferdigstillelse" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              onClick={async () => {
                const updated = await completeConfidentialMeasure(measure.id, note);
                setMeasure(updated);
              }}
            >
              Merk som utført
            </Button>
          </>
        )}
        <Button asChild variant="ghost">
          <Link href="/konfidensielt">Tilbake</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
