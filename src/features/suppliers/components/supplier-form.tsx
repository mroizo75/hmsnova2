"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPLIER_CRITICALITIES,
  SUPPLIER_CRITICALITY_LABELS,
  SUPPLIER_STATUSES,
  SUPPLIER_STATUS_LABELS,
  type SupplierCriticalityValue,
  type SupplierStatusValue,
} from "@/lib/supplier-management";
import { createSupplier, updateSupplier } from "@/server/actions/supplier.actions";

export interface SupplierFormValues {
  id?: string;
  name: string;
  orgNumber: string;
  scope: string;
  status: SupplierStatusValue;
  criticality: SupplierCriticalityValue;
  criteria: string;
  nextReviewAt: string;
  validUntil: string;
  notes: string;
}

const emptyValues: SupplierFormValues = {
  name: "",
  orgNumber: "",
  scope: "",
  status: "PENDING",
  criticality: "MEDIUM",
  criteria: "",
  nextReviewAt: "",
  validUntil: "",
  notes: "",
};

export function SupplierForm({ initial }: { initial?: SupplierFormValues }) {
  const values = initial ?? emptyValues;
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = values.id ? await updateSupplier(values.id, formData) : await createSupplier(formData);
      if (!result.success) {
        setError(result.error);
        toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
        return;
      }
      router.push(`/dashboard/leverandorer/${result.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Leverandør</CardTitle>
          <CardDescription>
            Godkjenning, kriterier og re-evaluering etter ISO 9001:2015 pkt. 8.4. Evaluering skjer som leverandørrevisjon, og feil som kvalitetsavvik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Navn</Label>
              <Input id="name" name="name" required minLength={2} defaultValue={values.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
              <Input id="orgNumber" name="orgNumber" defaultValue={values.orgNumber} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope">Hva leveres</Label>
            <Textarea id="scope" name="scope" rows={3} defaultValue={values.scope} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={values.status}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {SUPPLIER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SUPPLIER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="criticality">Kritikalitet</Label>
              <select
                id="criticality"
                name="criticality"
                defaultValue={values.criticality}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {SUPPLIER_CRITICALITIES.map((level) => (
                  <option key={level} value={level}>
                    {SUPPLIER_CRITICALITY_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="criteria">Kriterier</Label>
            <Textarea
              id="criteria"
              name="criteria"
              rows={4}
              defaultValue={values.criteria}
              placeholder="Krav til leveransen, dokumentasjon og tidligere erfaring"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nextReviewAt">Neste re-evaluering</Label>
              <Input id="nextReviewAt" name="nextReviewAt" type="date" defaultValue={values.nextReviewAt} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Gyldig til</Label>
              <Input id="validUntil" name="validUntil" type="date" defaultValue={values.validUntil} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notat</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={values.notes} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Lagrer…" : "Lagre"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
