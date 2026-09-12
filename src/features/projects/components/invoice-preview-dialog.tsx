"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createUnsentProjectInvoice, getInvoicePreview } from "@/server/actions/accounting.actions";

type Preview = {
  project: { name: string; clientName: string | null };
  lines: Array<{ id: string; description: string; count: number; unitPrice: number; amount: number }>;
  total: number;
};

export function InvoicePreviewDialog({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, start] = useTransition();

  async function load() {
    const res = await getInvoicePreview(projectId);
    if (res.success !== true) {
      toast({ title: "Kan ikke forhåndsvise", description: res.error, variant: "destructive" });
      return;
    }
    setPreview(res.data);
  }

  async function invoice() {
    const res = await createUnsentProjectInvoice(projectId);
    if (res.success !== true) {
      toast({
        title: "Faktura feilet",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Faktura opprettet i Tripletex",
      description: res.data.invoiceNumber
        ? `Nr. ${res.data.invoiceNumber} — usendt, sendes fra Tripletex`
        : "Usendt — sendes fra Tripletex",
    });
    setPreview(null);
    onDone();
  }

  if (!preview) {
    return (
      <Button
        size="sm"
        onClick={() => start(load)}
        disabled={pending}
      >
        Forhåndsvis faktura
      </Button>
    );
  }

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-base">Faktura · {preview.project.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {preview.lines.map((l) => (
          <div key={l.id} className="flex justify-between gap-2">
            <span>{l.description}</span>
            <span>{l.amount.toFixed(2)} kr</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-medium">
          <span>Sum eks. mva</span>
          <span>{preview.total.toFixed(2)} kr</span>
        </div>
        <p className="text-muted-foreground">Opprettes usendt i Tripletex.</p>
        <div className="flex gap-2">
          <Button onClick={() => start(invoice)} disabled={pending}>
            Opprett faktura i Tripletex
          </Button>
          <Button variant="outline" className="bg-transparent" onClick={() => setPreview(null)}>
            Avbryt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
