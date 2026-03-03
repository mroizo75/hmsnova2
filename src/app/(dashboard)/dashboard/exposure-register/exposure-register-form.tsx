"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExposureType } from "@prisma/client";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createExposureRegister, updateExposureRegister } from "@/server/actions/exposure-register.actions";
import type { CreateExposureRegisterInput } from "@/server/actions/exposure-register.actions";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Search, X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

/**
 * Validerer norsk fødselsnummer (11 siffer) ved hjelp av kontrollsiffer-algoritmen.
 * Returnerer "valid" | "invalid" | "incomplete".
 */
function validateFodselsnummer(value: string): "valid" | "invalid" | "incomplete" {
  const digits = value.replace(/\s/g, "");
  if (digits.length < 11) return "incomplete";
  if (!/^\d{11}$/.test(digits)) return "invalid";

  const d = digits.split("").map(Number);
  const w1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  const w2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  const s1 = w1.reduce((acc, w, i) => acc + w * d[i], 0);
  const k1 = 11 - (s1 % 11);
  if (k1 === 10) return "invalid";
  const k1Final = k1 === 11 ? 0 : k1;
  if (k1Final !== d[9]) return "invalid";

  const s2 = w2.reduce((acc, w, i) => acc + w * d[i], 0);
  const k2 = 11 - (s2 % 11);
  if (k2 === 10) return "invalid";
  const k2Final = k2 === 11 ? 0 : k2;
  if (k2Final !== d[10]) return "invalid";

  return "valid";
}

const EXPOSURE_TYPE_OPTIONS: { value: ExposureType; label: string }[] = [
  { value: "INHALATION", label: "Innånding" },
  { value: "SKIN", label: "Hudkontakt" },
  { value: "NOISE", label: "Støy" },
  { value: "VIBRATION", label: "Vibrasjon" },
  { value: "BIOLOGICAL", label: "Biologisk" },
  { value: "RADIATION", label: "Stråling" },
  { value: "OTHER", label: "Annet" },
];

type Employee = {
  id: string;
  name: string | null;
  email: string;
  department: string | null;
  employeeNumber: string | null;
};

type Chemical = {
  id: string;
  productName: string;
  casNumber: string | null;
};

type RuhReport = {
  id: string;
  ruhNummer: string | null;
  title: string;
  occurredAt: Date;
};

type Risk = {
  id: string;
  title: string;
  score: number;
  likelihood: number;
  consequence: number;
  status: string;
  riskAssessment: { title: string; assessmentYear: number } | null;
};

type ExistingEntry = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeBirthNumber: string;
  department: string | null;
  jobTitle: string;
  workLocation: string;
  employmentStartDate: Date | null;
  employmentEndDate: Date | null;
  chemicalId: string | null;
  exposureAgent: string;
  casNumber: string | null;
  exposureType: ExposureType;
  exposureStartDate: Date;
  exposureEndDate: Date | null;
  duration: string | null;
  ppeUsed: string | null;
  riskAssessmentDone: boolean;
  healthCheckRequired: boolean;
  healthCheckDone: boolean;
  healthCheckDate: Date | null;
  retentionYears: number;
  ruhReportId: string | null;
  riskId: string | null;
  comment: string | null;
};

interface Props {
  employees: Employee[];
  chemicals: Chemical[];
  ruhReports?: RuhReport[];
  risks?: Risk[];
  existing?: ExistingEntry;
  preselectedChemicalId?: string;
}

function toDateInput(date?: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

export function ExposureRegisterForm({ employees, chemicals, ruhReports = [], risks = [], existing, preselectedChemicalId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(existing?.employeeId ?? "");
  const [employeeName, setEmployeeName] = useState(existing?.employeeName ?? "");
  const [employeeBirthNumber, setEmployeeBirthNumber] = useState(existing?.employeeBirthNumber ?? "");
  const [birthNumberConfirm, setBirthNumberConfirm] = useState(existing?.employeeBirthNumber ?? "");
  const [internalEmployeeNumber, setInternalEmployeeNumber] = useState(() => {
    if (existing?.employeeId) {
      return employees.find((e) => e.id === existing.employeeId)?.employeeNumber ?? "";
    }
    return "";
  });
  const [department, setDepartment] = useState(existing?.department ?? "");
  const [jobTitle, setJobTitle] = useState(existing?.jobTitle ?? "");
  const [workLocation, setWorkLocation] = useState(existing?.workLocation ?? "");
  const [employmentStartDate, setEmploymentStartDate] = useState(toDateInput(existing?.employmentStartDate));
  const [employmentEndDate, setEmploymentEndDate] = useState(toDateInput(existing?.employmentEndDate));

  const [chemicalId, setChemicalId] = useState(() => {
    if (existing?.chemicalId) return existing.chemicalId;
    if (preselectedChemicalId) return preselectedChemicalId;
    return "";
  });
  const [exposureAgent, setExposureAgent] = useState(() => {
    if (existing?.exposureAgent) return existing.exposureAgent;
    if (preselectedChemicalId) {
      const c = chemicals.find((ch) => ch.id === preselectedChemicalId);
      return c?.productName ?? "";
    }
    return "";
  });
  const [casNumber, setCasNumber] = useState(() => {
    if (existing?.casNumber) return existing.casNumber;
    if (preselectedChemicalId) {
      const c = chemicals.find((ch) => ch.id === preselectedChemicalId);
      return c?.casNumber ?? "";
    }
    return "";
  });
  const [exposureType, setExposureType] = useState<ExposureType>(existing?.exposureType ?? "INHALATION");

  const [exposureStartDate, setExposureStartDate] = useState(toDateInput(existing?.exposureStartDate));
  const [exposureEndDate, setExposureEndDate] = useState(toDateInput(existing?.exposureEndDate));
  const [duration, setDuration] = useState(existing?.duration ?? "");
  const [ppeUsed, setPpeUsed] = useState(existing?.ppeUsed ?? "");
  const [riskAssessmentDone, setRiskAssessmentDone] = useState(existing?.riskAssessmentDone ?? false);

  const [healthCheckRequired, setHealthCheckRequired] = useState(existing?.healthCheckRequired ?? false);
  const [healthCheckDone, setHealthCheckDone] = useState(existing?.healthCheckDone ?? false);
  const [healthCheckDate, setHealthCheckDate] = useState(toDateInput(existing?.healthCheckDate));

  const [retentionYears, setRetentionYears] = useState(existing?.retentionYears ?? 40);
  const [ruhReportId, setRuhReportId] = useState(existing?.ruhReportId ?? "");
  const [riskId, setRiskId] = useState(existing?.riskId ?? "");
  const [riskSearch, setRiskSearch] = useState("");
  const [ruhSearch, setRuhSearch] = useState("");
  const [comment, setComment] = useState(existing?.comment ?? "");

  function handleEmployeeSelect(id: string) {
    const val = id === "_manual" ? "" : id;
    setEmployeeId(val);
    const emp = employees.find((e) => e.id === val);
    if (emp) {
      setEmployeeName(emp.name || emp.email);
      if (emp.department) setDepartment(emp.department);
      setInternalEmployeeNumber(emp.employeeNumber ?? "");
    } else {
      setInternalEmployeeNumber("");
    }
  }

  function handleChemicalSelect(id: string) {
    const val = id === "_manual" ? "" : id;
    setChemicalId(val);
    const chem = chemicals.find((c) => c.id === val);
    if (chem) {
      setExposureAgent(chem.productName);
      if (chem.casNumber) setCasNumber(chem.casNumber);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!employeeName.trim()) return setError("Navn på ansatt er påkrevd");
    if (!employeeBirthNumber.trim()) return setError("Fødselsnummer er påkrevd");
    if (validateFodselsnummer(employeeBirthNumber) === "invalid") return setError("Ugyldig fødselsnummer – kontrollsifrene stemmer ikke");
    if (employeeBirthNumber.trim() !== birthNumberConfirm.trim()) return setError("Fødselsnumrene stemmer ikke overens");
    if (!jobTitle.trim()) return setError("Stilling er påkrevd");
    if (!workLocation.trim()) return setError("Arbeidssted er påkrevd");
    if (!exposureAgent.trim()) return setError("Eksponeringsfaktor er påkrevd");
    if (!exposureStartDate) return setError("Startdato for eksponering er påkrevd");

    const input: CreateExposureRegisterInput = {
      employeeId: employeeId || undefined,
      employeeName: employeeName.trim(),
      employeeBirthNumber: employeeBirthNumber.trim(),
      department: department.trim() || undefined,
      jobTitle: jobTitle.trim(),
      workLocation: workLocation.trim(),
      employmentStartDate: employmentStartDate ? new Date(employmentStartDate) : undefined,
      employmentEndDate: employmentEndDate ? new Date(employmentEndDate) : undefined,
      chemicalId: chemicalId || undefined,
      exposureAgent: exposureAgent.trim(),
      casNumber: casNumber.trim() || undefined,
      exposureType,
      exposureStartDate: new Date(exposureStartDate),
      exposureEndDate: exposureEndDate ? new Date(exposureEndDate) : undefined,
      duration: duration.trim() || undefined,
      ppeUsed: ppeUsed.trim() || undefined,
      riskAssessmentDone,
      healthCheckRequired,
      healthCheckDone,
      healthCheckDate: healthCheckDate ? new Date(healthCheckDate) : undefined,
      retentionYears,
      ruhReportId: ruhReportId || undefined,
      riskId: riskId || undefined,
      comment: comment.trim() || undefined,
    };

    startTransition(async () => {
      const result = existing
        ? await updateExposureRegister(existing.id, input)
        : await createExposureRegister(input);

      if (result.success) {
        router.push("/dashboard/exposure-register");
        router.refresh();
      } else {
        setError(result.error || "Noe gikk galt");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Ansattinformasjon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ansattinformasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {employees.length > 0 && (
            <div className="space-y-2">
              <Label>Velg ansatt fra systemet (valgfritt – autofyller navn)</Label>
              <Select value={employeeId || "_manual"} onValueChange={handleEmployeeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansatt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_manual">– Skriv inn manuelt –</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name || emp.email}
                      {emp.department && ` (${emp.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Fullt navn *</Label>
              <Input
                id="employeeName"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Ola Nordmann"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="internalEmployeeNumber">Ansatt-ID (internt nr.)</Label>
              <Input
                id="internalEmployeeNumber"
                value={internalEmployeeNumber}
                onChange={(e) => setInternalEmployeeNumber(e.target.value)}
                placeholder="f.eks. A-0042"
                className="font-mono"
              />
              {employeeId && !internalEmployeeNumber && (
                <p className="text-xs text-amber-600">
                  Ingen ansattnummer registrert på denne ansatte – kan settes under Innstillinger → Brukere.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeBirthNumber">Fødselsnummer *</Label>
              {(() => {
                const status = validateFodselsnummer(employeeBirthNumber);
                return (
                  <>
                    <div className="relative">
                      <Input
                        id="employeeBirthNumber"
                        value={employeeBirthNumber}
                        onChange={(e) => setEmployeeBirthNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="11 siffer"
                        maxLength={11}
                        inputMode="numeric"
                        className={`pr-9 font-mono ${
                          status === "valid" ? "border-green-500 focus-visible:ring-green-500" :
                          status === "invalid" ? "border-red-400 focus-visible:ring-red-400" : ""
                        }`}
                        required
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        {status === "valid" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {status === "invalid" && <XCircle className="h-4 w-4 text-red-400" />}
                        {status === "incomplete" && employeeBirthNumber.length > 0 && (
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                        )}
                      </span>
                    </div>
                    {status === "valid" && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Gyldig fødselsnummer
                      </p>
                    )}
                    {status === "invalid" && employeeBirthNumber.length === 11 && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Ugyldig – kontrollsifrene stemmer ikke
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthNumberConfirm">
                Bekreft fødselsnummer *
              </Label>
              {(() => {
                const matches = birthNumberConfirm.length > 0 && birthNumberConfirm === employeeBirthNumber;
                const mismatch = birthNumberConfirm.length === employeeBirthNumber.length && birthNumberConfirm !== employeeBirthNumber;
                return (
                  <>
                    <div className="relative">
                      <Input
                        id="birthNumberConfirm"
                        value={birthNumberConfirm}
                        onChange={(e) => setBirthNumberConfirm(e.target.value.replace(/\D/g, ""))}
                        placeholder="Skriv inn igjen"
                        maxLength={11}
                        inputMode="numeric"
                        onPaste={(e) => e.preventDefault()}
                        className={`pr-9 font-mono ${
                          matches ? "border-green-500 focus-visible:ring-green-500" :
                          mismatch ? "border-red-400 focus-visible:ring-red-400" : ""
                        }`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        {matches && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {mismatch && <XCircle className="h-4 w-4 text-red-400" />}
                      </span>
                    </div>
                    {matches && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Fødselsnumrene stemmer overens
                      </p>
                    )}
                    {mismatch && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Stemmer ikke – sjekk igjen
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Lim inn er deaktivert – tast inn manuelt for å bekrefte</p>
                  </>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Avdeling</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Produksjon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Stilling/Rolle *</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Operatør"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workLocation">Arbeidssted/Lokasjon *</Label>
              <Input
                id="workLocation"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                placeholder="Fabrikk A, bygg 2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentStartDate">Ansettelsesdato</Label>
              <Input
                id="employmentStartDate"
                type="date"
                value={employmentStartDate}
                onChange={(e) => setEmploymentStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentEndDate">Fratredelsesdato</Label>
              <Input
                id="employmentEndDate"
                type="date"
                value={employmentEndDate}
                onChange={(e) => setEmploymentEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eksponeringsfaktor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eksponeringsfaktor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {chemicals.length > 0 && (
            <div className="space-y-2">
              <Label>Velg fra stoffkartotek (autofyller stoff og CAS-nr)</Label>
              <Select value={chemicalId || "_manual"} onValueChange={handleChemicalSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg kjemikalie fra stoffkartotek..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_manual">– Skriv inn manuelt –</SelectItem>
                  {chemicals.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.productName}
                      {c.casNumber && ` (CAS: ${c.casNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exposureAgent">Eksponeringsfaktor (navn på stoff) *</Label>
              <Input
                id="exposureAgent"
                value={exposureAgent}
                onChange={(e) => setExposureAgent(e.target.value)}
                placeholder="Toluen, kvartsstøv, sveiserøyk..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="casNumber">CAS-nummer</Label>
              <Input
                id="casNumber"
                value={casNumber}
                onChange={(e) => setCasNumber(e.target.value)}
                placeholder="108-88-3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exposureType">Type eksponering *</Label>
              <Select
                value={exposureType}
                onValueChange={(v) => setExposureType(v as ExposureType)}
              >
                <SelectTrigger id="exposureType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPOSURE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eksponeringsperiode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eksponeringsperiode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exposureStartDate">Startdato eksponering *</Label>
              <Input
                id="exposureStartDate"
                type="date"
                value={exposureStartDate}
                onChange={(e) => setExposureStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exposureEndDate">Sluttdato eksponering</Label>
              <Input
                id="exposureEndDate"
                type="date"
                value={exposureEndDate}
                onChange={(e) => setExposureEndDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">La stå tom hvis eksponering pågår</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Varighet (timer/dager/år)</Label>
            <Input
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="f.eks. 3 dager/uke, 2 timer/dag"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tiltak og kontroller */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tiltak og kontroller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ppeUsed">Verneutstyr brukt</Label>
            <Input
              id="ppeUsed"
              value={ppeUsed}
              onChange={(e) => setPpeUsed(e.target.value)}
              placeholder="f.eks. hansker, briller, åndedrettsvern P3"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="healthCheckRequired"
                checked={healthCheckRequired}
                onCheckedChange={(v) => setHealthCheckRequired(Boolean(v))}
              />
              <Label htmlFor="healthCheckRequired" className="cursor-pointer">
                Helsekontroll påkrevd
              </Label>
            </div>

            {healthCheckRequired && (
              <div className="ml-7 space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="healthCheckDone"
                    checked={healthCheckDone}
                    onCheckedChange={(v) => setHealthCheckDone(Boolean(v))}
                  />
                  <Label htmlFor="healthCheckDone" className="cursor-pointer">
                    Helsekontroll utført
                  </Label>
                </div>

                {healthCheckDone && (
                  <div className="space-y-2">
                    <Label htmlFor="healthCheckDate">Dato for helseundersøkelse</Label>
                    <Input
                      id="healthCheckDate"
                      type="date"
                      value={healthCheckDate}
                      onChange={(e) => setHealthCheckDate(e.target.value)}
                      className="max-w-[220px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* RUH-kobling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kobling til RUH-rapport</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ruhReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen RUH-rapporter registrert ennå.</p>
          ) : ruhReportId ? (
            (() => {
              const selected = ruhReports.find((r) => r.id === ruhReportId);
              return selected ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/40">
                  <div>
                    <span className="font-medium text-sm">
                      {selected.ruhNummer ?? "Uten nummer"}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">– {selected.title}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(selected.occurredAt), "dd.MM.yyyy", { locale: nb })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => { setRuhReportId(""); setRuhSearch(""); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null;
            })()
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søk på RUH-nummer eller tittel..."
                  value={ruhSearch}
                  onChange={(e) => setRuhSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {ruhSearch.trim() && (
                <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                  {ruhReports
                    .filter((r) => {
                      const q = ruhSearch.toLowerCase();
                      return (
                        r.title.toLowerCase().includes(q) ||
                        (r.ruhNummer?.toLowerCase().includes(q) ?? false)
                      );
                    })
                    .slice(0, 10)
                    .map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                        onClick={() => { setRuhReportId(r.id); setRuhSearch(""); }}
                      >
                        <div className="flex items-center gap-2">
                          {r.ruhNummer && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {r.ruhNummer}
                            </Badge>
                          )}
                          <span className="text-sm truncate">{r.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(r.occurredAt), "dd.MM.yyyy", { locale: nb })}
                        </div>
                      </button>
                    ))}
                  {ruhReports.filter((r) => {
                    const q = ruhSearch.toLowerCase();
                    return r.title.toLowerCase().includes(q) || (r.ruhNummer?.toLowerCase().includes(q) ?? false);
                  }).length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      Ingen treff
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Valgfritt – koble til RUH hvis eksponeringen skyldes en hendelse</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risikovurdering */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kobling til risikovurdering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen åpne risikovurderinger registrert ennå.</p>
          ) : riskId ? (
            (() => {
              const selected = risks.find((r) => r.id === riskId);
              return selected ? (
                <div className="flex items-start justify-between rounded-md border px-3 py-2 bg-muted/40">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{selected.title}</div>
                    {selected.riskAssessment && (
                      <div className="text-xs text-muted-foreground">
                        {selected.riskAssessment.title} ({selected.riskAssessment.assessmentYear})
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Score: {selected.score}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Sannsynlighet {selected.likelihood} × Konsekvens {selected.consequence}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 mt-0.5"
                    onClick={() => { setRiskId(""); setRiskSearch(""); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null;
            })()
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Søk på risikotittel eller vurdering..."
                  value={riskSearch}
                  onChange={(e) => setRiskSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {riskSearch.trim() && (
                <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                  {risks
                    .filter((r) => {
                      const q = riskSearch.toLowerCase();
                      return (
                        r.title.toLowerCase().includes(q) ||
                        (r.riskAssessment?.title.toLowerCase().includes(q) ?? false)
                      );
                    })
                    .slice(0, 10)
                    .map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
                        onClick={() => { setRiskId(r.id); setRiskSearch(""); }}
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 ${r.score >= 12 ? "border-red-300 text-red-700" : r.score >= 6 ? "border-yellow-300 text-yellow-700" : "border-green-300 text-green-700"}`}
                          >
                            {r.score}
                          </Badge>
                          <span className="text-sm truncate">{r.title}</span>
                        </div>
                        {r.riskAssessment && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {r.riskAssessment.title} ({r.riskAssessment.assessmentYear})
                          </div>
                        )}
                      </button>
                    ))}
                  {risks.filter((r) => {
                    const q = riskSearch.toLowerCase();
                    return r.title.toLowerCase().includes(q) || (r.riskAssessment?.title.toLowerCase().includes(q) ?? false);
                  }).length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">Ingen treff</div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Koble til den risikovurderingen som dekker denne eksponeringen</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lagring og kommentar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lagring og kommentar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retentionYears">Oppbevaringstid (år)</Label>
            <Select
              value={String(retentionYears)}
              onValueChange={(v) => setRetentionYears(Number(v))}
            >
              <SelectTrigger id="retentionYears" className="max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 år (biologiske faktorer)</SelectItem>
                <SelectItem value="40">40 år (standard)</SelectItem>
                <SelectItem value="60">60 år (kreftfremkallende)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Arbeidstilsynet krever 40–60 år for kjemisk eksponering
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar / tilleggsinformasjon</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Eventuelle tilleggsopplysninger om eksponeringen..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Avbryt
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Lagrer..." : existing ? "Lagre endringer" : "Registrer eksponering"}
        </Button>
      </div>
    </form>
  );
}
