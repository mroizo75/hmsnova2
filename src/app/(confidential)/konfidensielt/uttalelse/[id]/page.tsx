"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getConfidentialStatement,
  submitConfidentialStatement,
} from "@/server/actions/whistleblowing-access.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ConfidentialStatementPage() {
  const params = useParams<{ id: string }>();
  const [statement, setStatement] = useState<{
    id: string;
    summary: string;
    status: string;
    response: string | null;
  } | null>(null);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConfidentialStatement(params.id)
      .then((row) => {
        setStatement(row);
        setResponse(row.response ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Ingen tilgang"));
  }, [params.id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!statement) return <p className="text-sm text-muted-foreground">Laster…</p>;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Gi din uttalelse</CardTitle>
        <CardDescription>
          Du får en redigert beskrivelse av forholdet. Originalvarselet og varslerens identitet er ikke inkludert.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{statement.summary}</div>
        <Textarea
          rows={8}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          disabled={statement.status === "SUBMITTED"}
          placeholder="Din versjon av saken"
        />
        {statement.status !== "SUBMITTED" && (
          <Button
            onClick={async () => {
              const updated = await submitConfidentialStatement(statement.id, response);
              setStatement(updated);
            }}
          >
            Send uttalelse
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/konfidensielt">Tilbake</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
