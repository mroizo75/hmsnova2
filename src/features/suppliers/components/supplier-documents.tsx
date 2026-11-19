"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPLIER_DOCUMENT_KINDS,
  SUPPLIER_DOCUMENT_KIND_LABELS,
  type SupplierDocumentKindValue,
} from "@/lib/supplier-management";
import { addSupplierDocument, deleteSupplierDocument } from "@/server/actions/supplier-document.actions";

export interface SupplierDocumentView {
  id: string;
  title: string;
  kind: SupplierDocumentKindValue;
  reference: string | null;
  expiresAt: string | null;
  fileKey: string | null;
  fileName: string | null;
  expired: boolean;
}

function formatDate(value: string | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

export function SupplierDocuments({
  supplierId,
  documents,
}: {
  supplierId: string;
  documents: SupplierDocumentView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await addSupplierDocument(supplierId, formData);
      if (!result.success) {
        setError(result.error);
        toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
        return;
      }
      form.reset();
      toast({ title: "Dokumentet er lagret" });
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteSupplierDocument(id);
      if (!result.success) {
        toast({ variant: "destructive", title: "Kunne ikke slette", description: result.error });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {documents.length === 0 ? <p className="text-sm text-muted-foreground">Ingen dokumentasjon er registrert.</p> : null}
      <div className="space-y-2 text-sm">
        {documents.map((document) => (
          <div key={document.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {document.title}
                <span className="font-normal text-muted-foreground"> · {SUPPLIER_DOCUMENT_KIND_LABELS[document.kind]}</span>
              </p>
              <p className="text-muted-foreground">
                {document.reference ? `${document.reference} · ` : ""}
                Utløper {formatDate(document.expiresAt)}
                {document.expired ? " · utløpt" : ""}
              </p>
              {document.fileKey ? (
                <a className="hover:underline" href={`/api/files/${document.fileKey}`}>
                  {document.fileName ?? "Åpne fil"}
                </a>
              ) : null}
            </div>
            <Button type="button" variant="outline" disabled={pending} onClick={() => remove(document.id)}>
              Slett
            </Button>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-3 border-t pt-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-title">Navn</Label>
            <Input id="doc-title" name="title" required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-kind">Type</Label>
            <select id="doc-kind" name="kind" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              {SUPPLIER_DOCUMENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {SUPPLIER_DOCUMENT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-reference">Referanse</Label>
            <Input id="doc-reference" name="reference" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-expires">Utløper</Label>
            <Input id="doc-expires" name="expiresAt" type="date" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-file">Fil (PDF eller bilde)</Label>
          <Input id="doc-file" name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Legg til dokumentasjon"}
        </Button>
      </form>
    </div>
  );
}
