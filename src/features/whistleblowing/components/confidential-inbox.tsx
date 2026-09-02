"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchConfidentialInbox } from "@/server/actions/whistleblowing-access.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ConfidentialInbox() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchConfidentialInbox>> | null>(null);

  useEffect(() => {
    fetchConfidentialInbox()
      .then(setData)
      .catch(() => setData({ measures: [], statements: [], cases: [] }));
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Laster…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Konfidensielle oppgaver</h1>
        <p className="text-sm text-muted-foreground">Innholdet er begrenset til det du er tildelt.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Oppgaver</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.measures.length === 0 && <p className="text-sm text-muted-foreground">Ingen oppgaver</p>}
          {data.measures.map((measure) => (
            <div key={measure.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{measure.title}</p>
                <p className="text-xs text-muted-foreground">{measure.status}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={`/konfidensielt/tiltak/${measure.id}`}>Åpne</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uttalelser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.statements.length === 0 && <p className="text-sm text-muted-foreground">Ingen uttalelser</p>}
          {data.statements.map((statement) => (
            <div key={statement.id} className="flex items-center justify-between rounded-md border p-3">
              <p className="text-sm">Uttalelse · {statement.status}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/konfidensielt/uttalelse/${statement.id}`}>Åpne</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {data.cases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saksinnsyn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.cases.map((row) => (
              <div key={row.grantId} className="flex items-center justify-between rounded-md border p-3">
                <p className="text-sm">Konfidensiell sak</p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/whistleblowing/${row.whistleblowingId}`}>Åpne</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
