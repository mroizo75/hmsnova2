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
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  worksOnSite: boolean;
  status: SupplierStatusValue;
  criticality: SupplierCriticalityValue;
  criteria: string;
  controls: string;
  requirements: string;
  nextReviewAt: string;
  validUntil: string;
  notes: string;
}

const emptyValues: SupplierFormValues = {
  name: "",
  orgNumber: "",
  scope: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  worksOnSite: false,
  status: "PENDING",
  criticality: "MEDIUM",
  criteria: "",
  controls: "",
  requirements: "",
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
            Kriterier, styring og krav som kommuniseres til leverandøren (ISO 9001:2015 pkt. 8.4). Godkjenning krever også e-post og dato for re-evaluering.
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contactName">Kontaktperson</Label>
              <Input id="contactName" name="contactName" defaultValue={values.contactName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">E-post</Label>
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={values.contactEmail} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefon</Label>
              <Input id="contactPhone" name="contactPhone" defaultValue={values.contactPhone} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="worksOnSite" value="on" defaultChecked={values.worksOnSite} />
            Arbeider hos oss eller på felles arbeidsplass (AML § 2-2)
          </label>
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
            <Label htmlFor="criteria">Kriterier for vurdering og valg</Label>
            <Textarea
              id="criteria"
              name="criteria"
              rows={4}
              defaultValue={values.criteria}
              placeholder="Hva leverandøren vurderes på, for eksempel erfaring, dokumentasjon og tidligere leveranser"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="controls">Type og omfang av styring</Label>
            <Textarea
              id="controls"
              name="controls"
              rows={3}
              defaultValue={values.controls}
              placeholder="Hvordan leveransen følges opp, for eksempel mottakskontroll, revisjon eller selvevaluering"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requirements">Krav som er kommunisert</Label>
            <Textarea
              id="requirements"
              name="requirements"
              rows={4}
              defaultValue={values.requirements}
              placeholder="Krav til produkt, kompetanse, dokumentasjon og eventuell verifikasjon hos leverandøren"
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
