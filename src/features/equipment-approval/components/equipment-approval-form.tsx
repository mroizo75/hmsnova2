"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  EQUIPMENT_CATEGORY_OPTIONS,
  approvalIntervalExceedsAnnual,
  type EquipmentCategory,
  type EquipmentOperationalStatus,
} from "@/lib/equipment-approval";
import {
  createEquipmentApproval,
  updateEquipmentApproval,
} from "@/server/actions/equipment-approval.actions";

type EquipmentFormValues = {
  name: string;
  category: EquipmentCategory;
  supplierName: string;
  approvalBody: string;
  certificateNumber: string;
  serialNumber: string;
  location: string;
  validFrom: string;
  validTo: string;
  operationalStatus: EquipmentOperationalStatus;
  notes: string;
};

const EMPTY: EquipmentFormValues = {
  name: "",
  category: "BILLOFTER",
  supplierName: "",
  approvalBody: "",
  certificateNumber: "",
  serialNumber: "",
  location: "",
  validFrom: "",
  validTo: "",
  operationalStatus: "IN_USE",
  notes: "",
};

export function EquipmentApprovalForm({
  mode,
  equipmentId,
  initial,
}: {
  mode: "create" | "edit";
  equipmentId?: string;
  initial?: EquipmentFormValues;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<EquipmentFormValues>(initial ?? EMPTY);
  const [loading, setLoading] = useState(false);

  const longInterval =
    values.validFrom &&
    values.validTo &&
    approvalIntervalExceedsAnnual(values.validFrom, values.validTo);

  function setField<K extends keyof EquipmentFormValues>(key: K, value: EquipmentFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.set("category", values.category);
    formData.set("operationalStatus", values.operationalStatus);

    if (mode === "create") {
      const result = await createEquipmentApproval(formData);
      setLoading(false);
    if (!result.success) {
      const message = "error" in result ? result.error.message : "Kunne ikke lagre";
      toast({ variant: "destructive", title: "Kunne ikke lagre", description: message });
      return;
    }
      if (result.warning) {
        toast({ variant: "destructive", title: "Utstyr registrert", description: result.warning });
      } else {
        toast({ title: "Utstyr registrert" });
      }
      router.push(`/dashboard/utstyr/${result.data.id}`);
      router.refresh();
      return;
    }

    const result = await updateEquipmentApproval(equipmentId ?? "", formData);
    setLoading(false);
    if (!result.success) {
      const message = "error" in result ? result.error.message : "Kunne ikke lagre";
      toast({ variant: "destructive", title: "Kunne ikke lagre", description: message });
      return;
    }
    toast({ title: "Utstyr oppdatert" });
    router.push(`/dashboard/utstyr/${equipmentId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Utstyr og godkjenning</CardTitle>
          <CardDescription>
            Navn, leverandør og hvem som har utstedt attesten. Gyldig fra og til følger kontrollperioden,
            normalt høyst 12 måneder (FuA § 13-2).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Navn på utstyr</Label>
            <Input
              id="name"
              name="name"
              required
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="F.eks. Billøfter hall 1"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={values.category} onValueChange={(value) => setField("category", value as EquipmentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {EQUIPMENT_CATEGORY_OPTIONS.find((option) => option.value === values.category)?.legalNote}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={values.operationalStatus}
              onValueChange={(value) => setField("operationalStatus", value as EquipmentOperationalStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_USE">I bruk</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">Tatt ut av bruk (FuA § 12-5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplierName">Leverandør</Label>
            <Input
              id="supplierName"
              name="supplierName"
              required
              value={values.supplierName}
              onChange={(event) => setField("supplierName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="approvalBody">Godkjent av</Label>
            <Input
              id="approvalBody"
              name="approvalBody"
              required
              value={values.approvalBody}
              onChange={(event) => setField("approvalBody", event.target.value)}
              placeholder="Sakkyndig virksomhet eller kontrollør"
            />
            <p className="text-xs text-muted-foreground">FuA § 12-8 og § 13-4: det skal fremgå hvem som har kontrollert.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="validFrom">Gyldig fra</Label>
            <Input
              id="validFrom"
              name="validFrom"
              type="date"
              required
              value={values.validFrom}
              onChange={(event) => setField("validFrom", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validTo">Gyldig til</Label>
            <Input
              id="validTo"
              name="validTo"
              type="date"
              required
              value={values.validTo}
              onChange={(event) => setField("validTo", event.target.value)}
            />
          </div>
          {longInterval && (
            <p className="text-sm text-amber-800 md:col-span-2">
              Perioden er lengre enn 12 måneder. FuA § 13-2 krever at lengre intervall er dokumentert som forsvarlig.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Serienummer / intern ID</Label>
            <Input
              id="serialNumber"
              name="serialNumber"
              value={values.serialNumber}
              onChange={(event) => setField("serialNumber", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="certificateNumber">Attestnummer</Label>
            <Input
              id="certificateNumber"
              name="certificateNumber"
              value={values.certificateNumber}
              onChange={(event) => setField("certificateNumber", event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="location">Plassering</Label>
            <Input
              id="location"
              name="location"
              value={values.location}
              onChange={(event) => setField("location", event.target.value)}
              placeholder="F.eks. Verkstedhall A"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notat</Label>
            <Textarea
              id="notes"
              name="notes"
              value={values.notes}
              onChange={(event) => setField("notes", event.target.value)}
              rows={3}
            />
          </div>
          {mode === "create" && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="files">Kontrollattest og dokumenter</Label>
              <Input id="files" name="files" type="file" multiple accept=".pdf,.docx,image/jpeg,image/png,image/webp" />
              <p className="text-xs text-muted-foreground">
                PDF, Word eller bilde. Attesten skal kunne vises tilsynsmyndighet (FuA § 13-4).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer…" : "Lagre"}
        </Button>
        <Button type="button" variant="outline" className="bg-transparent" onClick={() => router.back()}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
