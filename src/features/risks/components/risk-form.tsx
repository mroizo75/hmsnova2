'use client';

import { useEffect, useMemo, useState } from "react";
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
import { createRisk, updateRisk } from "@/server/actions/risk.actions";
import { calculateRiskScore } from "@/features/risks/schemas/risk.schema";
import { useToast } from "@/hooks/use-toast";
import type {
  ControlFrequency,
  Risk,
  RiskCategory,
  RiskResponseStrategy,
  RiskTrend,
} from "@prisma/client";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, Lightbulb } from "lucide-react";

interface RiskFormProps {
  tenantId: string;
  userId: string;
  risk?: Risk;
  mode?: "create" | "edit";
  owners: Array<{ id: string; name?: string | null; email?: string | null }>;
  goalOptions?: Array<{ id: string; title: string }>;
  templateOptions?: Array<{ id: string; name: string }>;
  /** Kort som vises mellom Risikonivå og Rest-risiko (f.eks. Tiltak for å redusere risiko). Kun i edit-mode. */
  slotBetweenRisikonivaAndResidual?: React.ReactNode;
}

// ISO 45001/31000 – status for risikovurdering
const statusOptions = [
  { value: "OPEN", label: "Identifisert" },
  { value: "MITIGATING", label: "Tiltak iverksatt" },
  { value: "ACCEPTED", label: "Akseptert" },
  { value: "CLOSED", label: "Lukket" },
];

const categoryOptions: Array<{ value: RiskCategory; label: string }> = [
  { value: "OPERATIONAL", label: "Operasjonell" },
  { value: "SAFETY", label: "Sikkerhet" },
  { value: "HEALTH", label: "Helse" },
  { value: "ENVIRONMENTAL", label: "Miljø" },
  { value: "INFORMATION_SECURITY", label: "Informasjonssikkerhet" },
  { value: "LEGAL", label: "Juridisk/Compliance" },
  { value: "STRATEGIC", label: "Strategisk" },
  { value: "PSYCHOSOCIAL", label: "Psykososialt" },
  { value: "ERGONOMIC", label: "Ergonomisk" },
  { value: "ORGANISATIONAL", label: "Organisatorisk" },
  { value: "PHYSICAL", label: "Fysisk" },
];

const frequencyOptions: Array<{ value: ControlFrequency; label: string }> = [
  { value: "WEEKLY", label: "Ukentlig" },
  { value: "MONTHLY", label: "Månedlig" },
  { value: "QUARTERLY", label: "Kvartalsvis" },
  { value: "ANNUAL", label: "Årlig" },
  { value: "BIENNIAL", label: "Annet hvert år" },
];

const responseOptions: Array<{ value: RiskResponseStrategy; label: string; description: string }> = [
  { value: "AVOID", label: "Unngå", description: "Stopp aktiviteten eller endre prosess for å fjerne risikoen" },
  { value: "REDUCE", label: "Reduser", description: "Implementer kontroller for å senke sannsynlighet eller konsekvens" },
  { value: "TRANSFER", label: "Overfør", description: "Flytt risiko via forsikring, kontrakter eller leverandører" },
  { value: "ACCEPT", label: "Aksepter", description: "Aksepter risikoen innenfor definert toleranse" },
];

const trendOptions: Array<{ value: RiskTrend; label: string }> = [
  { value: "INCREASING", label: "Økende" },
  { value: "STABLE", label: "Stabil" },
  { value: "DECREASING", label: "Synkende" },
];

const NO_GOAL_VALUE = "__none_goal__";
const NO_TEMPLATE_VALUE = "__none_template__";

const formatDateInput = (value?: Date | string | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getDefaultNextReview = (frequency: ControlFrequency) => {
  const now = new Date();
  switch (frequency) {
    case "WEEKLY":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "MONTHLY":
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    case "QUARTERLY":
      return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    case "ANNUAL":
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    case "BIENNIAL":
      return new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }
};

export function RiskForm({
  tenantId,
  userId,
  risk,
  mode = "create",
  owners,
  goalOptions = [],
  templateOptions = [],
  slotBetweenRisikonivaAndResidual,
}: RiskFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [likelihood, setLikelihood] = useState(risk?.likelihood || 3);
  const [consequence, setConsequence] = useState(risk?.consequence || 3);
  const [ownerId, setOwnerId] = useState(risk?.ownerId || userId);
  const [category, setCategory] = useState<RiskCategory>(risk?.category || "OPERATIONAL");
  const [controlFrequency, setControlFrequency] = useState<ControlFrequency>(
    risk?.controlFrequency || "ANNUAL"
  );
  const [nextReviewTouched, setNextReviewTouched] = useState(Boolean(risk?.nextReviewDate));
  const [nextReviewDate, setNextReviewDate] = useState(
    formatDateInput(risk?.nextReviewDate ?? getDefaultNextReview(controlFrequency))
  );
  const [residualLikelihood, setResidualLikelihood] = useState<number | null>(
    risk?.residualLikelihood ?? null
  );
  const [residualConsequence, setResidualConsequence] = useState<number | null>(
    risk?.residualConsequence ?? null
  );
  const [selectedGoal, setSelectedGoal] = useState(risk?.kpiId ?? NO_GOAL_VALUE);
  const [selectedTemplate, setSelectedTemplate] = useState(
    risk?.inspectionTemplateId ?? NO_TEMPLATE_VALUE
  );
  const [riskAppetite, setRiskAppetite] = useState(risk?.riskAppetite ?? "");
  const [riskTolerance, setRiskTolerance] = useState(risk?.riskTolerance ?? "");
  const [responseStrategy, setResponseStrategy] = useState<RiskResponseStrategy>(
    risk?.responseStrategy ?? "REDUCE"
  );
  const [trend, setTrend] = useState<RiskTrend>(risk?.trend ?? "STABLE");
  const [reviewedAt, setReviewedAt] = useState(formatDateInput(risk?.reviewedAt));

  useEffect(() => {
    if (!nextReviewTouched) {
      const updated = getDefaultNextReview(controlFrequency);
      setNextReviewDate(formatDateInput(updated));
    }
  }, [controlFrequency, nextReviewTouched]);

  const { score, level, color, bgColor } = calculateRiskScore(likelihood, consequence);

  const residualScore = useMemo(() => {
    if (!residualLikelihood || !residualConsequence) return null;
    return calculateRiskScore(residualLikelihood, residualConsequence);
  }, [residualLikelihood, residualConsequence]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const payload = {
      title: formData.get("title") as string,
      context: formData.get("context") as string,
      likelihood,
      consequence,
      ownerId,
      status: (formData.get("status") as string) || "OPEN",
      category,
      location: formData.get("location") as string,
      area: formData.get("area") as string,
      description: formData.get("description") as string,
      existingControls: formData.get("existingControls") as string,
      controlFrequency,
      nextReviewDate: nextReviewDate || undefined,
      riskStatement: formData.get("riskStatement") as string,
      residualLikelihood,
      residualConsequence,
      kpiId: selectedGoal === NO_GOAL_VALUE ? undefined : selectedGoal,
      inspectionTemplateId: selectedTemplate === NO_TEMPLATE_VALUE ? undefined : selectedTemplate,
      linkedProcess: formData.get("linkedProcess") as string,
      riskAppetite,
      riskTolerance,
      responseStrategy,
      trend,
      reviewedAt: reviewedAt || undefined,
    };

    try {
      const result =
        mode === "create"
          ? await createRisk({ ...payload, tenantId })
          : await updateRisk({ ...payload, id: risk!.id });

      if (result.success) {
        toast({
          title: mode === "create" ? "✅ Risiko opprettet" : "✅ Risiko oppdatert",
          description: `Risikonivå: ${level} (${score})`,
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/risks");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lagre risiko",
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
          <CardDescription>
            Beskriv risikoen og hvem som eier den — IK-HMS § 5 nr. 6 krever skriftlig dokumentasjon av alle identifiserte farer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                name="title"
                placeholder="F.eks. Fall fra høyde ved arbeid på tak"
                defaultValue={risk?.title}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <Select value={category} onValueChange={(val: RiskCategory) => setCategory(val)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ownerId">Risiko-eier *</Label>
              <Select value={ownerId} onValueChange={setOwnerId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg risiko-eier" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name || owner.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={risk?.status || "OPEN"} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Lokasjon</Label>
              <Input
                id="location"
                name="location"
                placeholder="F.eks. Produksjonshall A"
                defaultValue={risk?.location ?? ""}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Område / Prosess</Label>
              <Input
                id="area"
                name="area"
                placeholder="Byggeplass, lager, etc."
                defaultValue={risk?.area ?? ""}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Beskrivelse og konsekvens</CardTitle>
          <CardDescription>
            Beskriv situasjonen og hva som kan skje (konsekvens). Eksisterende kontroller og notater under.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="context">Beskrivelse *</Label>
            <Textarea
              id="context"
              name="context"
              placeholder="Beskriv situasjonen, hvor det kan skje, hvem som er utsatt, etc."
              defaultValue={risk?.context}
              required
              disabled={loading}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="riskStatement">Konsekvens</Label>
            <Textarea
              id="riskStatement"
              name="riskStatement"
              placeholder="Hva kan skje dersom risikoscenarioet inntreffer? Beskriv konsekvensen."
              defaultValue={risk?.riskStatement ?? ""}
              disabled={loading}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="existingControls">Eksisterende kontroller</Label>
            <Textarea
              id="existingControls"
              name="existingControls"
              placeholder="Hvilke barrierer eller kontroller finnes i dag?"
              defaultValue={risk?.existingControls ?? ""}
              disabled={loading}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Tilleggsnotater</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Andre relevante detaljer, referanser eller observasjoner"
              defaultValue={risk?.description ?? ""}
              disabled={loading}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Risikonivå (AML § 3-1)</CardTitle>
            {(level === "MEDIUM" || level === "HIGH" || level === "CRITICAL") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    title="Tips"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-w-sm p-4"
                  sideOffset={8}
                >
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    Tips for {level === "CRITICAL" ? "kritisk" : level === "HIGH" ? "høy" : "medium"} risiko
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {mode === "edit"
                      ? "ISO 45001 anbefaler tiltak for å redusere risikoen. Scroll ned til «Tiltak for å redusere risiko» og legg til konkrete tiltak med ansvarlig person og frist."
                      : "Etter lagring kan du legge til tiltak for å redusere risikoen. ISO 45001 krever planlagte tiltak ved medium og høy risiko."}
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CardDescription>
            {risk?.riskAssessmentId
              ? "Satt da risikopunktet ble lagt inn. Endres på oversiktssiden ved behov."
              : "Sannsynlighet og konsekvens (1–5). Risikomatrisen vises på oversiktssiden /dashboard/risks"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {risk?.riskAssessmentId ? (
            <div className={`rounded-lg border-2 p-4 ${bgColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-xl font-bold ${color}`}>{level}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Sannsynlighet: {likelihood} × Konsekvens: {consequence} = {score}
                  </div>
                </div>
                <div className={`text-4xl font-bold ${color}`}>{score}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sannsynlighet (1–5)</Label>
                  <Select
                    value={String(likelihood)}
                    onValueChange={(v) => setLikelihood(Number(v))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Konsekvens (1–5)</Label>
                  <Select
                    value={String(consequence)}
                    onValueChange={(v) => setConsequence(Number(v))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={`rounded-lg border-2 p-4 ${bgColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xl font-bold ${color}`}>{level}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Sannsynlighet: {likelihood} × Konsekvens: {consequence} = {score}
                    </div>
                  </div>
                  <div className={`text-4xl font-bold ${color}`}>{score}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {mode === "edit" && slotBetweenRisikonivaAndResidual}

      <Card>
        <CardHeader>
          <CardTitle>Rest-risiko etter tiltak</CardTitle>
          <CardDescription>
            Vurder restrisiko når tiltak er gjennomført – skal bli lavere etter innførte tiltak (ISO 45001).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Residual Sannsynlighet</Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[residualLikelihood ?? 3]}
                onValueChange={([value]) => setResidualLikelihood(value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {residualLikelihood ? `Verdi: ${residualLikelihood}` : "Velg en verdi 1-5"}
              </p>
            </div>
            <div>
              <Label>Residual Konsekvens</Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[residualConsequence ?? 3]}
                onValueChange={([value]) => setResidualConsequence(value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {residualConsequence ? `Verdi: ${residualConsequence}` : "Velg en verdi 1-5"}
              </p>
            </div>
          </div>
          {residualScore && (
            <div className={`p-4 rounded-lg border ${residualScore.bgColor}`}>
              <p className={`font-semibold ${residualScore.color}`}>
                Residual nivå: {residualScore.level} ({residualScore.score})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oppfølging</CardTitle>
          <CardDescription>
            Frekvens og neste gjennomgangsdato — IK-HMS § 5 nr. 8 krever at risikovurderingen gjennomgås regelmessig.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="controlFrequency">Oppfølgingsfrekvens *</Label>
              <Select
                value={controlFrequency}
                onValueChange={(value: ControlFrequency) => setControlFrequency(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg frekvens" />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextReviewDate">Neste gjennomgang *</Label>
              <Input
                id="nextReviewDate"
                name="nextReviewDate"
                type="date"
                value={nextReviewDate}
                onChange={(event) => {
                  setNextReviewTouched(true);
                  setNextReviewDate(event.target.value);
                }}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Responsstrategi</Label>
              <Select
                value={responseStrategy}
                onValueChange={(value: RiskResponseStrategy) => setResponseStrategy(value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg strategi" />
                </SelectTrigger>
                <SelectContent>
                  {responseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avansert: ISO 31000-spesifikke felter – kun nødvendig for virksomhetsrisiko */}
      <AdvancedSection
        goalOptions={goalOptions}
        templateOptions={templateOptions}
        selectedGoal={selectedGoal}
        setSelectedGoal={setSelectedGoal}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        linkedProcess={risk?.linkedProcess ?? ""}
        riskAppetite={riskAppetite}
        setRiskAppetite={setRiskAppetite}
        riskTolerance={riskTolerance}
        setRiskTolerance={setRiskTolerance}
        trend={trend}
        setTrend={setTrend}
        reviewedAt={reviewedAt}
        setReviewedAt={setReviewedAt}
        loading={loading}
      />

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : mode === "create" ? "Opprett risiko" : "Lagre endringer"}
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

interface AdvancedSectionProps {
  goalOptions: Array<{ id: string; title: string }>;
  templateOptions: Array<{ id: string; name: string }>;
  selectedGoal: string;
  setSelectedGoal: (v: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (v: string) => void;
  linkedProcess: string;
  riskAppetite: string;
  setRiskAppetite: (v: string) => void;
  riskTolerance: string;
  setRiskTolerance: (v: string) => void;
  trend: RiskTrend;
  setTrend: (v: RiskTrend) => void;
  reviewedAt: string;
  setReviewedAt: (v: string) => void;
  loading: boolean;
}

function AdvancedSection({
  goalOptions,
  templateOptions,
  selectedGoal,
  setSelectedGoal,
  selectedTemplate,
  setSelectedTemplate,
  linkedProcess,
  riskAppetite,
  setRiskAppetite,
  riskTolerance,
  setRiskTolerance,
  trend,
  setTrend,
  reviewedAt,
  setReviewedAt,
  loading,
}: AdvancedSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/30">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div>
          <p className="font-medium text-sm">Avansert – ISO 31000 / virksomhetsrisiko</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Risikoappetitt, KPI-kobling, inspeksjonsmal m.m. — ikke nødvendig for standard AML-vurdering
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="linkedProcess">Knyttet til prosess</Label>
              <Input
                id="linkedProcess"
                name="linkedProcess"
                placeholder="F.eks. Vedlikehold, Montasje"
                defaultValue={linkedProcess}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kpiId">Koble til mål/KPI</Label>
              <Select
                value={selectedGoal}
                onValueChange={setSelectedGoal}
                disabled={goalOptions.length === 0 || loading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={goalOptions.length ? "Velg mål (valgfritt)" : "Ingen mål tilgjengelig"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GOAL_VALUE}>Ingen</SelectItem>
                  {goalOptions.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectionTemplateId">Inspeksjonsmal</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                disabled={templateOptions.length === 0 || loading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={templateOptions.length ? "Velg mal (valgfritt)" : "Ingen maler tilgjengelig"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE_VALUE}>Ingen</SelectItem>
                  {templateOptions.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="riskAppetite">Risikoappetitt</Label>
              <Textarea
                id="riskAppetite"
                name="riskAppetite"
                placeholder="Beskriv hvilket nivå av risiko virksomheten aksepterer"
                value={riskAppetite}
                onChange={(e) => setRiskAppetite(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskTolerance">Risiko-toleranse</Label>
              <Textarea
                id="riskTolerance"
                name="riskTolerance"
                placeholder="Beskriv hvilke avvik/indikatorer som utløser tiltak"
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Trend</Label>
              <Select value={trend} onValueChange={(value: RiskTrend) => setTrend(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg trend" />
                </SelectTrigger>
                <SelectContent>
                  {trendOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewedAt">Sist gjennomgått (ISO 31000)</Label>
              <Input
                id="reviewedAt"
                name="reviewedAt"
                type="date"
                value={reviewedAt}
                onChange={(e) => setReviewedAt(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}