"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createHazardousWasteDelivery } from "@/server/actions/hazardous-waste.actions";
import {
  AVFALLSDEKLARERING_URL,
  HAZARDOUS_WASTE_TYPES,
  hazardousWasteLabel,
} from "@/lib/hazardous-waste";

export type WasteDeliveryRow = {
  id: string;
  wasteType: string;
  customType: string | null;
  amountKg: number;
  deliveredAt: string;
  declarationNumber: string;
  recipient: string;
};

export type WasteAspectOption = {
  id: string;
  title: string;
};

export function HazardousWasteCard({
  deliveries,
  wasteAspects,
  canUpdate,
}: {
  deliveries: WasteDeliveryRow[];
  wasteAspects: WasteAspectOption[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [wasteType, setWasteType] = useState<string>("KJOLEVAESKE");
  const [customType, setCustomType] = useState("");
  const [amountKg, setAmountKg] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [declarationNumber, setDeclarationNumber] = useState("");
  const [recipient, setRecipient] = useState("");
  const [aspectId, setAspectId] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createHazardousWasteDelivery({
        wasteType,
        customType: wasteType === "ANNET" ? customType : null,
        amountKg,
        deliveredAt,
        declarationNumber,
        recipient,
        aspectId: aspectId || null,
      });
      if (result.success) {
        toast({ title: "Leveranse registrert" });
        setCustomType("");
        setAmountKg("");
        setDeliveredAt("");
        setDeclarationNumber("");
        setRecipient("");
        router.refresh();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Farlig avfall</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Avfallsforskriften kap. 11. Deklarer hos Miljødirektoratet før levering, og registrer beviset her.
            Kjølevæske og glykol er farlig avfall.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={AVFALLSDEKLARERING_URL} target="_blank" rel="noreferrer">
            avfallsdeklarering.no
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen leveranser registrert.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {deliveries.map((delivery) => (
              <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  {hazardousWasteLabel(delivery.wasteType, delivery.customType)} · {delivery.amountKg} kg ·{" "}
                  {delivery.recipient}
                </span>
                <span className="text-muted-foreground">
                  {new Date(delivery.deliveredAt).toLocaleDateString("nb-NO")} · {delivery.declarationNumber}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canUpdate && (
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Avfallstype</Label>
              <Select value={wasteType} onValueChange={setWasteType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HAZARDOUS_WASTE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {wasteType === "ANNET" && (
              <div className="space-y-1">
                <Label htmlFor="customType">Beskrivelse</Label>
                <Input id="customType" value={customType} onChange={(event) => setCustomType(event.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="amountKg">Mengde (kg)</Label>
              <Input
                id="amountKg"
                type="number"
                min="0"
                step="0.1"
                value={amountKg}
                onChange={(event) => setAmountKg(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deliveredAt">Leveringsdato</Label>
              <Input
                id="deliveredAt"
                type="date"
                value={deliveredAt}
                onChange={(event) => setDeliveredAt(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="declarationNumber">Deklarasjonsnummer</Label>
              <Input
                id="declarationNumber"
                value={declarationNumber}
                onChange={(event) => setDeclarationNumber(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recipient">Mottak</Label>
              <Input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} required />
            </div>
            {wasteAspects.length > 0 && (
              <div className="space-y-1 md:col-span-2">
                <Label>Knytt til avfallsaspekt</Label>
                <Select value={aspectId || "none"} onValueChange={(value) => setAspectId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Valgfritt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ikke knyttet</SelectItem>
                    {wasteAspects.map((aspect) => (
                      <SelectItem key={aspect.id} value={aspect.id}>
                        {aspect.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrer leveranse
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
