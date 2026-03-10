"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createIncident } from "@/server/actions/incident.actions";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, AlertTriangle, BarChart3, Users } from "lucide-react";
import Image from "next/image";
import type { IncidentType } from "@prisma/client";

interface SubcategoryOption {
  id: string;
  key: string;
  label: string;
  industry: string;
}

interface IncidentFormProps {
  tenantId: string;
  userId: string;
  risks: Array<{ id: string; title: string; category: string; score: number }>;
  users: Array<{ id: string; name: string | null; email: string }>;
  projects: Array<{ id: string; name: string; code: string | null; status: string }>;
  defaultType?: IncidentType;
  defaultProjectId?: string;
}

/**
 * Hendelsestyper basert på AML § 5-1, § 5-2 og IK-HMS § 5.
 * ULYKKE/NESTEN/FARLIG_SITUASJON = AML § 5-2 og § 2-3
 * YRKESSYKDOM = AML § 5-1 (registreringsplikt) og § 5-3 (leges meldeplikt)
 * AVVIK = IK-HMS § 5 og ISO 9001 kap. 10.2
 */
const incidentTypes: Array<{
  value: IncidentType;
  label: string;
  desc: string;
  badge?: string;
  group: "hms" | "avvik" | "annet";
}> = [
  {
    value: "ULYKKE",
    label: "Arbeidsulykke / RUH",
    desc: "Energi frigitt og skade/tap oppstod på person, materiell eller miljø",
    badge: "AML § 5-2 – varslingspliktig",
    group: "hms",
  },
  {
    value: "NESTEN",
    label: "Nestenulykke / RUH",
    desc: "Energi frigitt, men ingen skade – under andre omstendigheter ville ulykke ha skjedd",
    badge: "AML § 5-2 – tilløp til ulykke",
    group: "hms",
  },
  {
    value: "FARLIG_SITUASJON",
    label: "Farlig situasjon / Observasjon",
    desc: "Farlig tilstand eller uønsket forhold som representerer en fare, men ingen energi frigitt",
    badge: "AML § 2-3",
    group: "hms",
  },
  {
    value: "YRKESSYKDOM",
    label: "Yrkessykdom / Arbeidsrelatert sykdom",
    desc: "Sykdom som antas å ha sin grunn i arbeidet eller forholdene på arbeidsplassen",
    badge: "AML § 5-1",
    group: "hms",
  },
  {
    value: "AVVIK",
    label: "Avvik",
    desc: "Brudd på lovgivning, interne krav, prosedyrer eller standarder (ISO 9001 kap. 10.2)",
    group: "avvik",
  },
  {
    value: "MILJO",
    label: "Miljøavvik",
    desc: "Utslipp, søl eller annet avvik fra miljøkrav (ISO 14001)",
    group: "avvik",
  },
  {
    value: "KVALITET",
    label: "Kvalitetsavvik",
    desc: "Produkt- eller tjenestekvalitet som ikke møter krav (ISO 9001)",
    group: "avvik",
  },
  {
    value: "CUSTOMER",
    label: "Kundeklage",
    desc: "Klage eller tilbakemelding fra kunde/bruker (ISO 10002)",
    group: "annet",
  },
];

// Typer som aktiverer RUH/HMS-spesifikke seksjoner
const HMS_TYPES: IncidentType[] = ["ULYKKE", "NESTEN", "FARLIG_SITUASJON", "YRKESSYKDOM"];
// Typer som aktiverer HSE-statistikk (TRIR)
const HSE_STATS_TYPES: IncidentType[] = ["ULYKKE", "NESTEN", "YRKESSYKDOM"];

const severityLevels = [
  { value: 1, label: "1 - Ubetydelig", desc: "Ingen konsekvenser" },
  { value: 2, label: "2 - Mindre", desc: "Små konsekvenser" },
  { value: 3, label: "3 - Moderat", desc: "Merkbare konsekvenser" },
  { value: 4, label: "4 - Alvorlig", desc: "Store konsekvenser" },
  { value: 5, label: "5 - Kritisk", desc: "Svært alvorlige konsekvenser" },
];

const NO_RISK_REFERENCE_VALUE = "__none_risk_reference__";

const NO_PROJECT_VALUE = "__none_project__";

export function IncidentForm({
  tenantId,
  userId,
  risks = [],
  users = [],
  projects = [],
  defaultType,
  defaultProjectId,
}: IncidentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<IncidentType | "">(
    defaultType || ""
  );
  const NO_REPORTED_FOR_VALUE = "__none__";
  const [reportedForUserId, setReportedForUserId] = useState<string>(
    NO_REPORTED_FOR_VALUE
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Underkategorier
  const [subcategoryOptions, setSubcategoryOptions] = useState<SubcategoryOption[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Prosjektvelger
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId ?? NO_PROJECT_VALUE
  );

  // HSE-statistikk
  const [isFatal, setIsFatal] = useState(false);
  const [isLostTimeIncident, setIsLostTimeIncident] = useState(false);
  const [isRestrictedWork, setIsRestrictedWork] = useState(false);
  const [medicalAttentionRequired, setMedicalAttentionRequired] = useState(false);

  const isHmsType = selectedType ? HMS_TYPES.includes(selectedType as IncidentType) : false;
  const isHseStatsType = selectedType ? HSE_STATS_TYPES.includes(selectedType as IncidentType) : false;
  const isCustomerType = selectedType === "CUSTOMER";

  const fetchSubcategories = useCallback(async (type: IncidentType) => {
    setLoadingSubcategories(true);
    setSelectedSubcategories([]);
    try {
      const res = await fetch(`/api/incidents/subcategories?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setSubcategoryOptions(data.options ?? []);
      }
    } catch {
      setSubcategoryOptions([]);
    } finally {
      setLoadingSubcategories(false);
    }
  }, []);

  useEffect(() => {
    if (selectedType) {
      fetchSubcategories(selectedType as IncidentType);
    } else {
      setSubcategoryOptions([]);
      setSelectedSubcategories([]);
    }
  }, [selectedType, fetchSubcategories]);

  function toggleSubcategory(key: string) {
    setSelectedSubcategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

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
      location: (formData.get("location") as string) || undefined,
      witnessName: (formData.get("witnessName") as string) || undefined,
      immediateAction: (formData.get("immediateAction") as string) || undefined,
      injuryType: (formData.get("injuryType") as string) || undefined,
      medicalAttentionRequired,
      lostTimeMinutes: formData.get("lostTimeMinutes")
        ? parseInt(formData.get("lostTimeMinutes") as string, 10)
        : undefined,
      reportedForUserId:
        reportedForUserId && reportedForUserId !== NO_REPORTED_FOR_VALUE
          ? reportedForUserId
          : undefined,
      riskReferenceId:
        rawRiskReferenceId && rawRiskReferenceId !== NO_RISK_REFERENCE_VALUE
          ? rawRiskReferenceId
          : undefined,
      customerName: (formData.get("customerName") as string) || undefined,
      customerEmail: (formData.get("customerEmail") as string) || undefined,
      customerPhone: (formData.get("customerPhone") as string) || undefined,
      customerTicketId: (formData.get("customerTicketId") as string) || undefined,
      responseDeadline: (formData.get("responseDeadline") as string) || undefined,
      customerSatisfaction: formData.get("customerSatisfaction")
        ? parseInt(formData.get("customerSatisfaction") as string, 10)
        : undefined,
      // Prosjektkobling
      projectId:
        selectedProjectId !== NO_PROJECT_VALUE ? selectedProjectId : undefined,
      // Underkategorier
      subcategoryKeys: selectedSubcategories,
      // RUH-felt
      involvedPersons: (formData.get("involvedPersons") as string) || undefined,
      injuryDescription: (formData.get("injuryDescription") as string) || undefined,
      suggestedActions: (formData.get("suggestedActions") as string) || undefined,
      // HSE-statistikk
      isFatal,
      isLostTimeIncident,
      lostWorkdays: formData.get("lostWorkdays")
        ? parseInt(formData.get("lostWorkdays") as string, 10)
        : undefined,
      isRestrictedWork,
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

      if (imageFiles.length > 0 && result.data?.id) {
        const imgFormData = new FormData();
        imageFiles.forEach((file) => imgFormData.append("images", file));
        await fetch(`/api/incidents/${result.data.id}/attachments`, {
          method: "POST",
          body: imgFormData,
        });
      }

      const redirectRoute =
        result.data?.type === "CUSTOMER"
          ? "/dashboard/complaints"
          : "/dashboard/incidents";
      toast({
        title: "Avvik rapportert",
        description: "Avviket er registrert og vil bli fulgt opp",
        className: "bg-green-50 border-green-200",
      });
      router.push(redirectRoute);
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = incidentTypes.find((t) => t.value === selectedType);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Grunnleggende informasjon ── */}
      <Card>
        <CardHeader>
          <CardTitle>Grunnleggende informasjon</CardTitle>
          <CardDescription>
            AML § 5-2 / IK-HMS § 5 – Rapporter hva som skjedde
          </CardDescription>
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
                onValueChange={(value) =>
                  setSelectedType(value as IncidentType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg type" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    HMS / Personskade
                  </div>
                  {incidentTypes
                    .filter((t) => t.group === "hms")
                    .map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  <div className="px-2 py-1 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t">
                    Avvik / Kvalitet
                  </div>
                  {incidentTypes
                    .filter((t) => t.group === "avvik")
                    .map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  <div className="px-2 py-1 mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t">
                    Annet
                  </div>
                  {incidentTypes
                    .filter((t) => t.group === "annet")
                    .map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedTypeInfo && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {selectedTypeInfo.desc}
                  </p>
                  {selectedTypeInfo.badge && (
                    <span className="inline-block rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      {selectedTypeInfo.badge}
                    </span>
                  )}
                </div>
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
                    <SelectItem
                      key={level.value}
                      value={level.value.toString()}
                    >
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Prosjektvelger ── */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label>Knytt til prosjekt / jobb</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg prosjekt (valgfritt)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>— Ingen / ikke prosjektrelatert —</SelectItem>
                  {projects
                    .filter((p) => p.status === "ACTIVE" || p.status === "PLANNING")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.code ? ` (${p.code})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kobling til prosjekt gir samlet HMS-rapport per jobb/oppdrag
              </p>
            </div>
          )}

          {/* ── Underkategorier (sjekkbokser) ── */}
          {selectedType && subcategoryOptions.length > 0 && (
            <div className="space-y-3">
              <Label>
                Hendelsen dreier seg om
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (velg én eller flere)
                </span>
              </Label>
              {loadingSubcategories ? (
                <p className="text-xs text-muted-foreground">Laster kategorier…</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 rounded-lg border bg-muted/30 p-4">
                  {subcategoryOptions.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={selectedSubcategories.includes(opt.key)}
                        onCheckedChange={() => toggleSubcategory(opt.key)}
                        disabled={loading}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

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
            <Label htmlFor="description">Beskrivelse av hendelse *</Label>
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
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (valgfritt – for leder/HMS som rapporterer for ansatt)
                </span>
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
                  <SelectItem value={NO_REPORTED_FOR_VALUE}>
                    — Ingen (rapporterer for meg selv) —
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── RUH / HMS-spesifikke felt ── */}
      {isHmsType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Personinvolvering og resultat
            </CardTitle>
            <CardDescription>
              AML § 5-2 – Rapport om uønsket hendelse (RUH)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="involvedPersons">Involverte personer</Label>
              <Textarea
                id="involvedPersons"
                name="involvedPersons"
                placeholder="Navn og rolle på alle involverte personer"
                disabled={loading}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="injuryDescription">Resultat av hendelse</Label>
              <Textarea
                id="injuryDescription"
                name="injuryDescription"
                placeholder="Beskriv eventuelle skader, skadeomfang og umiddelbare konsekvenser"
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="injuryType">Type skade/eksponering</Label>
                <Input
                  id="injuryType"
                  name="injuryType"
                  placeholder="F.eks. Kuttskade, fallskade, kjemisk eksponering"
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
                    <SelectValue
                      placeholder={
                        risks.length
                          ? "Velg risiko (valgfritt)"
                          : "Ingen risikoer tilgjengelig"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RISK_REFERENCE_VALUE}>
                      Ingen
                    </SelectItem>
                    {risks.map((risk) => (
                      <SelectItem key={risk.id} value={risk.id}>
                        {risk.title} · Score {risk.score}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggestedActions">Foreslåtte forebyggende tiltak</Label>
              <Textarea
                id="suggestedActions"
                name="suggestedActions"
                placeholder="Hva mener du bør gjøres for å forhindre at dette skjer igjen?"
                disabled={loading}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── HSE-statistikk (TRIR) ── */}
      {isHseStatsType && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              HSE-statistikk
            </CardTitle>
            <CardDescription>
              Brukes til TRIR-beregning og rapportering til kunder/myndigheter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isFatal}
                    onCheckedChange={(v) => setIsFatal(!!v)}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">Dødsfall</span>
                </div>
                <span className="text-xs text-muted-foreground">Fatality</span>
              </label>

              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isLostTimeIncident}
                    onCheckedChange={(v) => setIsLostTimeIncident(!!v)}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">Fraværsskade</span>
                </div>
                <span className="text-xs text-muted-foreground">LTI</span>
              </label>

              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isRestrictedWork}
                    onCheckedChange={(v) => setIsRestrictedWork(!!v)}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">Begrenset arbeid</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Restricted work
                </span>
              </label>

              <label className="flex flex-col gap-2 rounded-lg border bg-background p-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={medicalAttentionRequired}
                    onCheckedChange={(v) =>
                      setMedicalAttentionRequired(!!v)
                    }
                    disabled={loading}
                  />
                  <span className="text-sm font-medium">Legebehandling</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Medical treatment
                </span>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lostWorkdays">Fraværsdager</Label>
                <Input
                  id="lostWorkdays"
                  name="lostWorkdays"
                  type="number"
                  min={0}
                  placeholder="Antall tapte arbeidsdager"
                  disabled={loading || !isLostTimeIncident}
                />
                <p className="text-xs text-muted-foreground">
                  Fyll ut hvis fraværsskade er valgt
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lostTimeMinutes">Tapt tid (minutter)</Label>
                <Input
                  id="lostTimeMinutes"
                  name="lostTimeMinutes"
                  type="number"
                  min={0}
                  placeholder="Presist antall minutter (valgfritt)"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="rounded-md bg-orange-100 border border-orange-200 px-4 py-3 text-xs text-orange-900">
              <strong>TRIR-formel:</strong> (Dødsfall + Fraværsskader + Begrenset arbeid + Legebehandling) × 200 000 / Arbeidede timer
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Legebehandling for ikke-TRIR-typer ── */}
      {!isHseStatsType && !isCustomerType && (
        <Card>
          <CardHeader>
            <CardTitle>Skade og oppfølging</CardTitle>
            <CardDescription>
              ISO 45001: dokumenter personskade og koble til risiko
            </CardDescription>
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
                <Label htmlFor="riskReferenceId">Knytt til risikovurdering</Label>
                <Select
                  name="riskReferenceId"
                  disabled={loading || risks.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        risks.length
                          ? "Velg risiko (valgfritt)"
                          : "Ingen risikoer tilgjengelig"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_RISK_REFERENCE_VALUE}>
                      Ingen
                    </SelectItem>
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
      )}

      {/* ── Kundeklage ── */}
      {isCustomerType && (
        <Card>
          <CardHeader>
            <CardTitle>Kundeklage</CardTitle>
            <CardDescription>
              ISO 10002: registrer hvem som klager og hvordan saken skal håndteres
            </CardDescription>
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
                  required={isCustomerType}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Kunde e-post</Label>
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  placeholder="kunde@firma.no"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefon</Label>
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  placeholder="+47 99 99 99 99"
                  disabled={loading}
                />
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
                <Input
                  id="responseDeadline"
                  name="responseDeadline"
                  type="date"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerSatisfaction">Tilfredshet (1-5)</Label>
                <Select name="customerSatisfaction" disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg vurdering" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <SelectItem key={v} value={v.toString()}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Umiddelbare tiltak ── */}
      <Card>
        <CardHeader>
          <CardTitle>Umiddelbare tiltak og årsak</CardTitle>
          <CardDescription>
            ISO 9001 kap. 10.2 – Hva ble gjort umiddelbart, og hva er årsak?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="immediateAction">Umiddelbare tiltak</Label>
            <Textarea
              id="immediateAction"
              name="immediateAction"
              placeholder="F.eks. Stoppet arbeidet, ryddet området, sikret vitner, varslet leder..."
              disabled={loading}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Bilder ── */}
      <Card>
        <CardHeader>
          <CardTitle>Bilder</CardTitle>
          <CardDescription>
            Last opp bilder som dokumenterer hendelsen (valgfritt, maks 5)
          </CardDescription>
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
                  {imageFiles.length >= 5
                    ? "Maks 5 bilder"
                    : "Klikk for å legge til bilder"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {imageFiles.length > 0
                    ? `${imageFiles.length}/5 bilder valgt`
                    : "PNG, JPG, HEIC støttes"}
                </p>
              </div>
            </Label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border"
                >
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

      {/* ── Lovforankring-info ── */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Etter rapportering
        </h3>
        <div className="text-sm text-blue-800 space-y-1">
          <ul className="space-y-1 list-disc list-inside ml-2">
            <li>Leder vil utrede årsak (årsaksanalyse / ROT)</li>
            <li>Korrigerende og forebyggende tiltak planlegges</li>
            <li>Effektiviteten av tiltak vil bli evaluert (ISO 9001: 10.2)</li>
            {isHseStatsType && (
              <li className="font-medium">
                Inngår i TRIR-statistikk og HSE-rapportering til oppdragsgivere
              </li>
            )}
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
