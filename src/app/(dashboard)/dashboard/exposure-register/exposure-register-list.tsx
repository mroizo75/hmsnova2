"use client";

import { useState } from "react";
import Link from "next/link";
import { ExposureRegisterStatus, ExposureType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Search,
  AlertCircle,
  ExternalLink,
  FlaskConical,
  MapPin,
  Calendar,
  Shield,
  Heart,
  User,
  FileWarning,
  ShieldAlert,
  SlidersHorizontal,
  HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { EndExposureDialog } from "./end-exposure-dialog";

type Entry = {
  id: string;
  employeeName: string;
  department: string | null;
  jobTitle: string;
  workLocation: string;
  exposureAgent: string;
  casNumber: string | null;
  exposureType: ExposureType;
  exposureStartDate: Date;
  exposureEndDate: Date | null;
  duration: string | null;
  ppeUsed: string | null;
  healthCheckRequired: boolean;
  healthCheckDone: boolean;
  healthCheckDate: Date | null;
  status: ExposureRegisterStatus;
  registeredBy: string;
  createdAt: Date;
  comment: string | null;
  employee: { id: string; name: string | null; email: string } | null;
  chemical: { id: string; productName: string; casNumber: string | null } | null;
  ruhReport: { id: string; ruhNummer: string | null; title: string; occurredAt: Date } | null;
  risk: {
    id: string;
    title: string;
    score: number;
    status: string;
    riskAssessment: { title: string; assessmentYear: number } | null;
  } | null;
};

const EXPOSURE_TYPE_LABELS: Record<ExposureType, string> = {
  INHALATION: "Innånding",
  SKIN: "Hudkontakt",
  NOISE: "Støy",
  VIBRATION: "Vibrasjon",
  BIOLOGICAL: "Biologisk",
  RADIATION: "Stråling",
  OTHER: "Annet",
};

const EXPOSURE_TYPE_COLORS: Record<ExposureType, string> = {
  INHALATION: "bg-blue-100 text-blue-700",
  SKIN: "bg-purple-100 text-purple-700",
  NOISE: "bg-yellow-100 text-yellow-700",
  VIBRATION: "bg-orange-100 text-orange-700",
  BIOLOGICAL: "bg-red-100 text-red-700",
  RADIATION: "bg-rose-100 text-rose-700",
  OTHER: "bg-gray-100 text-gray-600",
};

function StatusHelpTip() {
  return (
    <span className="relative inline-flex group">
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50",
          "w-64 rounded-lg border border-slate-200 bg-white shadow-lg p-3",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
        ].join(" ")}
      >
        {/* Pil */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-200" />
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-[5px] border-4 border-transparent border-t-white" />

        <p className="text-xs font-semibold text-slate-800 mb-2">Hva betyr statusene?</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-orange-500 shrink-0 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-orange-800">Pågående</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ansatt er fortsatt eksponert. Klikk <strong>Avslutt</strong> når eksponeringen opphører.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-700">Avsluttet</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Eksponeringen er ferdig, men registreringen beholdes i 40–60 år iht. regelverket.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-gray-300 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500">Arkivert</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Oppbevaringsplikt utløpt. Kan kun arkiveres etter 40–60 år.
              </p>
            </div>
          </div>
        </div>
      </span>
    </span>
  );
}

function StatusIndicator({ status }: { status: ExposureRegisterStatus }) {
  if (status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
        Pågående
      </span>
    );
  if (status === "INACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Avsluttet
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5">
      Arkivert
    </span>
  );
}

function RiskScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 12
      ? "bg-red-100 text-red-700 border-red-200"
      : score >= 6
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : "bg-green-100 text-green-700 border-green-200";
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold border ${cls}`}>
      {score}
    </span>
  );
}

/**
 * Effektiv status: hvis sluttdato er satt og har passert → Avsluttet,
 * uavhengig av hva som er lagret i status-feltet i DB.
 */
function effectiveStatus(entry: Pick<Entry, "status" | "exposureEndDate">): ExposureRegisterStatus {
  if (
    entry.status !== "ARCHIVED" &&
    entry.exposureEndDate &&
    new Date(entry.exposureEndDate) < new Date()
  ) {
    return "INACTIVE";
  }
  return entry.status;
}

export function ExposureRegisterList({ entries }: { entries: Entry[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      e.employeeName.toLowerCase().includes(q) ||
      e.exposureAgent.toLowerCase().includes(q) ||
      (e.casNumber?.toLowerCase().includes(q) ?? false) ||
      (e.department?.toLowerCase().includes(q) ?? false) ||
      e.workLocation.toLowerCase().includes(q);
    const matchType = typeFilter === "all" || e.exposureType === typeFilter;
    const matchStatus = statusFilter === "all" || effectiveStatus(e) === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div>
      {/* Filterbar */}
      <div className="p-4 border-b bg-gray-50/50 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Søk ansatt, stoff, CAS-nr, sted..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters ? "bg-primary/10 border-primary/30" : ""}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-white sm:w-[200px]">
                <SelectValue placeholder="Type eksponering" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle eksponeringer</SelectItem>
                {Object.entries(EXPOSURE_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statuser</SelectItem>
                  <SelectItem value="ACTIVE">Pågående</SelectItem>
                  <SelectItem value="INACTIVE">Avsluttet</SelectItem>
                </SelectContent>
              </Select>
              <StatusHelpTip />
            </div>
            {(typeFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
                className="text-muted-foreground"
              >
                Nullstill filter
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tom tilstand */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7" />
          </div>
          <p className="font-medium">Ingen registreringer funnet</p>
          <p className="text-sm">Prøv å justere søk eller filter</p>
        </div>
      ) : (
        <div className="divide-y">
          {filtered.map((entry) => {
            const status = effectiveStatus(entry);
            const isActive = status === "ACTIVE";
            const healthAlert = entry.healthCheckRequired && !entry.healthCheckDone;

            return (
              <div
                key={entry.id}
                className={`group relative px-5 py-4 hover:bg-gray-50/80 transition-colors ${
                  healthAlert ? "border-l-4 border-l-red-400" : isActive ? "border-l-4 border-l-orange-400" : "border-l-4 border-l-transparent"
                }`}
              >
                {/* Topplinje: ansatt + status + redigerknapp */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{entry.employeeName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.jobTitle}
                        {entry.department ? ` · ${entry.department}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusIndicator status={status} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isActive && (
                        <EndExposureDialog
                          id={entry.id}
                          employeeName={entry.employeeName}
                          exposureAgent={entry.chemical?.productName ?? entry.exposureAgent}
                        />
                      )}
                      <Link href={`/dashboard/exposure-register/${entry.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Innhold: to kolonner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 pl-10">
                  {/* Eksponeringsfaktor */}
                  <div className="lg:col-span-1">
                    <div className="flex items-start gap-2">
                      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Eksponeringsfaktor</p>
                        <p className="text-sm font-medium truncate">
                          {entry.chemical?.productName ?? entry.exposureAgent}
                        </p>
                        {entry.casNumber && (
                          <p className="text-xs text-muted-foreground font-mono">CAS: {entry.casNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Periode + sted */}
                  <div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Periode</p>
                        <p className="text-sm">
                          {format(new Date(entry.exposureStartDate), "dd.MM.yyyy", { locale: nb })}
                          {entry.exposureEndDate
                            ? ` – ${format(new Date(entry.exposureEndDate), "dd.MM.yyyy", { locale: nb })}`
                            : <span className="text-orange-600"> – pågående</span>}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{entry.workLocation}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Helsekontroll */}
                  <div>
                    <div className="flex items-start gap-2">
                      <Heart className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Helsekontroll</p>
                        {!entry.healthCheckRequired ? (
                          <p className="text-xs text-muted-foreground">Ikke påkrevd</p>
                        ) : entry.healthCheckDone ? (
                          <p className="text-xs text-green-700 font-medium">
                            ✓ Utført{" "}
                            {entry.healthCheckDate &&
                              format(new Date(entry.healthCheckDate), "dd.MM.yyyy", { locale: nb })}
                          </p>
                        ) : (
                          <p className="text-xs text-red-600 font-semibold">⚠ Ikke utført</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nedre rad: type-badge + PPE + RUH/Risiko */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pl-10">
                  <span
                    className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 ${
                      EXPOSURE_TYPE_COLORS[entry.exposureType]
                    }`}
                  >
                    {EXPOSURE_TYPE_LABELS[entry.exposureType]}
                  </span>

                  {entry.ppeUsed && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">
                      <Shield className="h-3 w-3" />
                      {entry.ppeUsed}
                    </span>
                  )}

                  {entry.ruhReport && (
                    <Link
                      href={`/dashboard/ruh/${entry.ruhReport.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full px-2 py-0.5 transition-colors"
                    >
                      <FileWarning className="h-3 w-3" />
                      RUH {entry.ruhReport.ruhNummer ?? ""}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}

                  {entry.risk && (
                    <Link
                      href={`/dashboard/risks/${entry.risk.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5 transition-colors"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      <RiskScoreBadge score={entry.risk.score} />
                      <span className="max-w-[140px] truncate">{entry.risk.title}</span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bunntekst */}
      <div className="px-5 py-3 border-t bg-gray-50/50 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Viser <span className="font-medium text-foreground">{filtered.length}</span> av{" "}
          <span className="font-medium text-foreground">{entries.length}</span> registreringer
        </p>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Oppbevares ihht. Arbeidstilsynets krav (40–60 år)
        </p>
      </div>
    </div>
  );
}
