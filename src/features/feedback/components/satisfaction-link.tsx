"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SatisfactionLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Innhenting fra kunder</CardTitle>
        <CardDescription>
          Lenken lagrer svaret som tilbakemelding med kilde spørreundersøkelse. Snittet skrives til kundemålet for året (ISO 9001 pkt. 9.1.2). Navn er frivillig.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="flex-1 break-all rounded-md border bg-muted px-3 py-2 text-xs">{href}</code>
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? "Kopiert" : "Kopier lenke"}
        </Button>
      </CardContent>
    </Card>
  );
}
