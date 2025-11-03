"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createIncident } from "@/server/actions/incident.actions";
import { useToast } from "@/hooks/use-toast";
import type { IncidentType } from "@prisma/client";

interface IncidentFormProps {
  tenantId: string;
  userId: string;
}

const incidentTypes: Array<{ value: IncidentType; label: string; desc: string }> = [
  { value: "AVVIK", label: "Avvik", desc: "Avvik fra prosedyrer eller krav" },
  { value: "NESTEN", label: "Nestenulykke", desc: "Hendelse som kunne ført til skade" },
  { value: "SKADE", label: "Personskade", desc: "Skade på person" },
  { value: "MILJO", label: "Miljøhendelse", desc: "Utslipp, søl eller miljøskade" },
  { value: "KVALITET", label: "Kvalitetsavvik", desc: "Produkt/tjeneste kvalitet" },
];

const severityLevels = [
  { value: 1, label: "1 - Ubetydelig", desc: "Ingen konsekvenser" },
  { value: 2, label: "2 - Mindre", desc: "Små konsekvenser" },
  { value: 3, label: "3 - Moderat", desc: "Merkbare konsekvenser" },
  { value: 4, label: "4 - Alvorlig", desc: "Store konsekvenser" },
  { value: 5, label: "5 - Kritisk", desc: "Svært alvorlige konsekvenser" },
];

export function IncidentForm({ tenantId, userId }: IncidentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<IncidentType | "">("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      tenantId,
      type: formData.get("type") as IncidentType,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      severity: parseInt(formData.get("severity") as string),
      occurredAt: formData.get("occurredAt") as string,
      reportedBy: userId,
      location: formData.get("location") as string || undefined,
      witnessName: formData.get("witnessName") as string || undefined,
      immediateAction: formData.get("immediateAction") as string || undefined,
    };

    try {
      const result = await createIncident(data);

      if (result.success) {
        toast({
          title: "✅ Avvik rapportert",
          description: "Avviket er registrert og vil bli fulgt opp",
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/incidents");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke rapportere avvik",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grunnleggende informasjon</CardTitle>
          <CardDescription>ISO 9001: Rapporter hva som skjedde</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type hendelse *</Label>
              <Select
                name="type"
                required
                disabled={loading}
                value={selectedType}
                onValueChange={(value) => setSelectedType(value as IncidentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg type" />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  {incidentTypes.find(t => t.value === selectedType)?.desc}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Alvorlighetsgrad *</Label>
              <Select name="severity" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg alvorlighet" />
                </SelectTrigger>
                <SelectContent>
                  {severityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. Fall fra stige ved lagerarbeid"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Beskriv detaljert hva som skjedde, når, hvor og hvem som var involvert"
              required
              disabled={loading}
              rows={5}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="occurredAt">Når skjedde det? *</Label>
              <Input
                id="occurredAt"
                name="occurredAt"
                type="datetime-local"
                required
                disabled={loading}
                max={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Hvor skjedde det?</Label>
              <Input
                id="location"
                name="location"
                placeholder="F.eks. Lager 2, Produksjonshall A"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="witnessName">Vitner (navn)</Label>
            <Input
              id="witnessName"
              name="witnessName"
              placeholder="Navn på vitner til hendelsen"
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Umiddelbare tiltak</CardTitle>
          <CardDescription>
            ISO 9001: Hva ble gjort umiddelbart for å kontrollere situasjonen?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="immediateAction">Umiddelbare tiltak</Label>
            <Textarea
              id="immediateAction"
              name="immediateAction"
              placeholder="F.eks. Stoppet arbeidet, ryddet området, sikret vitner, varslet leder..."
              disabled={loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Beskriv hva som ble gjort for å håndtere situasjonen umiddelbart
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 ISO 9001 - Avvikshåndtering</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Etter rapportering:</strong></p>
          <ul className="space-y-1 list-disc list-inside ml-4">
            <li>Leder vil utrede årsak (årsaksanalyse)</li>
            <li>Korrigerende tiltak vil bli planlagt</li>
            <li>Effektiviteten av tiltak vil bli evaluert</li>
            <li>Læringspunkter vil bli dokumentert</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Rapporterer..." : "Rapporter avvik"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}

