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
import { Camera, X } from "lucide-react";
import Image from "next/image";
import type { IncidentType } from "@prisma/client";

interface IncidentFormProps {
  tenantId: string;
  userId: string;
  risks: Array<{ id: string; title: string; category: string; score: number }>;
  users: Array<{ id: string; name: string | null; email: string }>;
  defaultType?: IncidentType;
}

/**
 * Hendelsestyper basert på AML § 5-1, § 5-2 og IK-HMS § 5.
 * ULYKKE/NESTEN/FARLIG_SITUASJON = AML § 5-2 og § 2-3
 * YRKESSYKDOM = AML § 5-1 (registreringsplikt) og § 5-3 (leges meldeplikt)
 * AVVIK = IK-HMS § 5 og ISO 9001 kap. 10.2
 */
const incidentTypes: Array<{ value: IncidentType; label: string; desc: string; badge?: string }> = [
  {
    value: "ULYKKE",
    label: "Arbeidsulykke",
    desc: "Energi frigitt og skade/tap oppstod på person, materiell eller miljø",
    badge: "AML § 5-2 – varslingspliktig",
  },
  {
    value: "NESTEN",
    label: "Nestenulykke",
    desc: "Energi frigitt, men ingen skade – under andre omstendigheter ville ulykke ha skjedd",
    badge: "AML § 5-2 – tilløp til ulykke",
  },
  {
    value: "FARLIG_SITUASJON",
    label: "Farlig situasjon / Observasjon",
    desc: "Farlig tilstand eller uønsket forhold som representerer en fare, men ingen energi frigitt",
    badge: "AML § 2-3",
  },
  {
    value: "YRKESSYKDOM",
    label: "Yrkessykdom / Arbeidsrelatert sykdom",
    desc: "Sykdom som antas å ha sin grunn i arbeidet eller forholdene på arbeidsplassen",
    badge: "AML § 5-1",
  },
  {
    value: "AVVIK",
    label: "Avvik",
    desc: "Brudd på lovgivning, interne krav, prosedyrer eller standarder (ISO 9001 kap. 10.2)",
  },
  {
    value: "MILJO",
    label: "Miljøavvik",
    desc: "Utslipp, søl eller annet avvik fra miljøkrav (ISO 14001)",
  },
  {
    value: "KVALITET",
    label: "Kvalitetsavvik",
    desc: "Produkt- eller tjenestekvalitet som ikke møter krav (ISO 9001)",
  },
  {
    value: "CUSTOMER",
    label: "Kundeklage",
    desc: "Klage eller tilbakemelding fra kunde/bruker (ISO 10002)",
  },
];

const severityLevels = [
  { value: 1, label: "1 - Ubetydelig", desc: "Ingen konsekvenser" },
  { value: 2, label: "2 - Mindre", desc: "Små konsekvenser" },
  { value: 3, label: "3 - Moderat", desc: "Merkbare konsekvenser" },
  { value: 4, label: "4 - Alvorlig", desc: "Store konsekvenser" },
  { value: 5, label: "5 - Kritisk", desc: "Svært alvorlige konsekvenser" },
];

const NO_RISK_REFERENCE_VALUE = "__none_risk_reference__";

export function IncidentForm({ tenantId, userId, risks = [], users = [], defaultType }: IncidentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<IncidentType | "">(defaultType || "");
  const NO_REPORTED_FOR_VALUE = "__none__";
  const [reportedForUserId, setReportedForUserId] = useState<string>(NO_REPORTED_FOR_VALUE);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const merged = [...imageFiles, ...files].slice(0, 5);
    setImageFiles(merged);
    setImagePreviews(merged.map((f) => URL.createObjectURL(f)));
  }

  function removeImage(index: number) {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawRiskReferenceId = formData.get("riskReferenceId") as string | null;
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
      injuryType: formData.get("injuryType") as string || undefined,
      medicalAttentionRequired: formData.get("medicalAttentionRequired") === "yes",
      lostTimeMinutes: formData.get("lostTimeMinutes")
        ? parseInt(formData.get("lostTimeMinutes") as string, 10)
        : undefined,
      reportedForUserId: reportedForUserId && reportedForUserId !== NO_REPORTED_FOR_VALUE ? reportedForUserId : undefined,
      riskReferenceId:
        rawRiskReferenceId && rawRiskReferenceId !== NO_RISK_REFERENCE_VALUE
          ? rawRiskReferenceId
          : undefined,
      customerName: formData.get("customerName") as string || undefined,
      customerEmail: formData.get("customerEmail") as string || undefined,
      customerPhone: formData.get("customerPhone") as string || undefined,
      customerTicketId: formData.get("customerTicketId") as string || undefined,
      responseDeadline: formData.get("responseDeadline") as string || undefined,
      customerSatisfaction: formData.get("customerSatisfaction")
        ? parseInt(formData.get("customerSatisfaction") as string, 10)
        : undefined,
    };

    try {
      const result = await createIncident(data);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke rapportere avvik",
        });
        return;
      }

      // Last opp bilder hvis det finnes noen
      if (imageFiles.length > 0 && result.data?.id) {
        const imgFormData = new FormData();
        imageFiles.forEach((file) => imgFormData.append("images", file));
        await fetch(`/api/incidents/${result.data.id}/attachments`, {
          method: "POST",
          body: imgFormData,
        });
      }

      const redirectRoute = result.data?.type === "CUSTOMER" ? "/dashboard/complaints" : "/dashboard/incidents";
      toast({
        title: "✅ Avvik rapportert",
        description: "Avviket er registrert og vil bli fulgt opp",
        className: "bg-green-50 border-green-200",
      });
      router.push(redirectRoute);
      router.refresh();
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
                value={selectedType || undefined}
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
              {selectedType && (() => {
                const t = incidentTypes.find(t => t.value === selectedType);
                return t ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                    {t.badge && (
                      <span className="inline-block rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        {t.badge}
                      </span>
                    )}
                  </div>
                ) : null;
              })()}
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

          {users.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="reportedForUserId">
                Rapportert på vegne av
                <span className="ml-1 text-xs font-normal text-muted-foreground">(valgfritt – for leder/HMS som rapporterer for ansatt)</span>
              </Label>
              <Select
                value={reportedForUserId}
                onValueChange={setReportedForUserId}
                disabled={loading}
              >
                <SelectTrigger id="reportedForUserId">
                  <SelectValue placeholder="Velg ansatt (valgfritt)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REPORTED_FOR_VALUE}>— Ingen (rapporterer for meg selv) —</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Bruk dette feltet når du som leder eller HMS-ansvarlig rapporterer en hendelse på vegne av en ansatt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedType === "CUSTOMER" && (
        <Card>
          <CardHeader>
            <CardTitle>Kundeklage</CardTitle>
            <CardDescription>ISO 10002: registrer hvem som klager og hvordan saken skal håndteres</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Kundenavn *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="Navn på kunde/bedrift"
                  disabled={loading}
                  required={selectedType === "CUSTOMER"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Kunde e-post</Label>
                <Input id="customerEmail" name="customerEmail" type="email" placeholder="kunde@firma.no" disabled={loading} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefon</Label>
                <Input id="customerPhone" name="customerPhone" placeholder="+47 99 99 99 99" disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerTicketId">Referanse / saknr.</Label>
                <Input
                  id="customerTicketId"
                  name="customerTicketId"
                  placeholder="F.eks. Zendesk #124"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="responseDeadline">Lovet svarfrist</Label>
                <Input id="responseDeadline" name="responseDeadline" type="date" disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerSatisfaction">Tilfredshet (1-5)</Label>
                <Select name="customerSatisfaction" disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg vurdering" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <SelectItem key={value} value={value.toString()}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Skade og oppfølging</CardTitle>
          <CardDescription>ISO 45001: dokumenter personskade og koble til risiko</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="injuryType">Type skade</Label>
              <Input
                id="injuryType"
                name="injuryType"
                placeholder="F.eks. Kuttskade, fallskade, kjemisk eksponering"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicalAttentionRequired">Legebehandling</Label>
              <Select
                name="medicalAttentionRequired"
                defaultValue="no"
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Var lege involvert?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Nei</SelectItem>
                  <SelectItem value="yes">Ja, legebehandling nødvendig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lostTimeMinutes">Tapt tid (minutter)</Label>
              <Input
                id="lostTimeMinutes"
              name="lostTimeMinutes"
                type="number"
                min={0}
                placeholder="Antall minutter/timer fravær"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskReferenceId">Knytt til risikovurdering</Label>
              <Select
                name="riskReferenceId"
                disabled={loading || risks.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={risks.length ? "Velg risiko (valgfritt)" : "Ingen risikoer tilgjengelig"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RISK_REFERENCE_VALUE}>Ingen</SelectItem>
                  {risks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      {risk.title} · Score {risk.score}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Bilder</CardTitle>
          <CardDescription>Last opp bilder som dokumenterer hendelsen (valgfritt, maks 5)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              id="incident-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={loading || imageFiles.length >= 5}
              className="sr-only"
            />
            <Label
              htmlFor="incident-images"
              className={`flex items-center justify-center gap-2 h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                imageFiles.length >= 5 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Camera className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {imageFiles.length >= 5 ? "Maks 5 bilder" : "Klikk for å legge til bilder"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {imageFiles.length > 0 ? `${imageFiles.length}/5 bilder valgt` : "PNG, JPG, HEIC støttes"}
                </p>
              </div>
            </Label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={preview}
                    alt={`Forhåndsvisning ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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

