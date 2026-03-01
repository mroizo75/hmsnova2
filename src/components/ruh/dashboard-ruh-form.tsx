"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createRuhReport } from "@/server/actions/ruh.actions";
import { Loader2 } from "lucide-react";

interface DashboardRuhFormProps {
  tenantId: string;
  reportedBy: string;
}

export function DashboardRuhForm({ tenantId, reportedBy }: DashboardRuhFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [injuryOccurred, setInjuryOccurred] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const input = {
      tenantId,
      category: formData.get("category") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      occurredAt: formData.get("occurredAt") as string || new Date().toISOString(),
      location: formData.get("location") as string,
      reportedBy: formData.get("reportedByName") as string || reportedBy,
      involvedPersons: formData.get("involvedPersons") as string,
      witnessName: formData.get("witnessName") as string,
      injuryOccurred,
      injuryDescription: injuryOccurred ? (formData.get("injuryDescription") as string) : undefined,
      immediateAction: formData.get("immediateAction") as string,
      suggestedActions: formData.get("suggestedActions") as string,
    };

    try {
      const result = await createRuhReport(input);

      if (result.success) {
        toast({
          title: "RUH-rapport opprettet",
          description: `Rapport ${result.data?.ruhNummer} er registrert.`,
        });
        router.push("/dashboard/ruh");
      } else {
        toast({
          title: "Feil",
          description: result.error || "Kunne ikke opprette rapport",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Feil",
        description: "Noe gikk galt. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Kategori *</Label>
          <Select name="category" required>
            <SelectTrigger>
              <SelectValue placeholder="Velg kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERSONSKADE">Personskade</SelectItem>
              <SelectItem value="NESTENULYKKE">Nestenulykke</SelectItem>
              <SelectItem value="MATERIELL_SKADE">Materiell skade</SelectItem>
              <SelectItem value="BRANN_EKSPLOSJON">Brann / Eksplosjon</SelectItem>
              <SelectItem value="UTSLIPP_MILJO">Utslipp / Miljø</SelectItem>
              <SelectItem value="TRUSLER_VOLD">Trusler / Vold</SelectItem>
              <SelectItem value="ERGONOMI">Ergonomi</SelectItem>
              <SelectItem value="ANNET">Annet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="occurredAt">Hendelsestidspunkt *</Label>
          <Input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            required
            defaultValue={new Date().toISOString().slice(0, 16)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Kort beskrivelse av hendelsen *</Label>
        <Input
          id="title"
          name="title"
          placeholder="F.eks: Fall fra stige på lager"
          required
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">Sted *</Label>
          <Input
            id="location"
            name="location"
            placeholder="F.eks: Verksted, bygg A"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reportedByName">Rapportert av</Label>
          <Input
            id="reportedByName"
            name="reportedByName"
            defaultValue={reportedBy}
            placeholder="Navn på den som rapporterer"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Detaljert beskrivelse *</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Beskriv hendelsen i detalj: hva skjedde, hvordan, under hvilke omstendigheter..."
          required
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="involvedPersons">Involverte personer</Label>
        <Textarea
          id="involvedPersons"
          name="involvedPersons"
          placeholder="Navn og rolle på involverte"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="witnessName">Vitner</Label>
        <Input
          id="witnessName"
          name="witnessName"
          placeholder="Navn på eventuelle vitner"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="injury-switch" className="font-medium">
            Ble noen skadet?
          </Label>
          <p className="text-xs text-muted-foreground">
            Oppgi om hendelsen medførte personskade
          </p>
        </div>
        <Switch
          id="injury-switch"
          checked={injuryOccurred}
          onCheckedChange={setInjuryOccurred}
        />
      </div>

      {injuryOccurred && (
        <div className="space-y-2">
          <Label htmlFor="injuryDescription">Beskriv skaden</Label>
          <Textarea
            id="injuryDescription"
            name="injuryDescription"
            placeholder="Type skade, kroppsdel, behandling gitt..."
            rows={3}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="immediateAction">Umiddelbare tiltak</Label>
        <Textarea
          id="immediateAction"
          name="immediateAction"
          placeholder="Hva ble gjort på stedet for å håndtere situasjonen?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="suggestedActions">Foreslåtte forebyggende tiltak</Label>
        <Textarea
          id="suggestedActions"
          name="suggestedActions"
          placeholder="Hva kan gjøres for å unngå at dette skjer igjen?"
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Lagrer...
            </>
          ) : (
            "Registrer RUH-rapport"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/ruh")}
          disabled={isSubmitting}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}
