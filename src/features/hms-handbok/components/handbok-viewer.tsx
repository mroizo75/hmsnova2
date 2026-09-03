"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, PenLine, Download, AlertTriangle, ExternalLink, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TilsynsrapportDialog } from "./tilsynsrapport-dialog";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { HandbokSectionExpanded } from "./handbok-section-expanded";
import { HandbokVersionBar } from "./handbok-version-bar";
import { HandbokSignButton } from "./handbok-sign-button";
import { HandbokReviewButton } from "./handbok-review-button";
import { ensureHrSections, toggleSectionEnabled, updateSectionExternalRef } from "@/server/actions/hms-handbok.actions";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  HandbookData,
  LiveHandbookStats,
} from "@/server/actions/hms-handbok.actions";

// Seksjoner som kun er relevante for ledelse/admin (IK-HMS § 5 nr. 8)
const ADMIN_ONLY_SECTIONS = new Set(["s9", "s10", "s13", "s14"]);

interface HandbokViewerProps {
  tenantId: string;
  tenantName: string;
  orgNumber?: string | null;
  industry?: string | null;
  hmsContactName?: string | null;
  hmsContactPhone?: string | null;
  handbook: HandbookData;
  stats: LiveHandbookStats;
  currentUserId: string;
  canManage: boolean;
  canApprove: boolean;
  isEmployee?: boolean;
  suggestions?: Array<{
    id: string;
    title: string;
    description: string;
    legalBasis: string | null;
    priority: number;
    targetSectionKey: string | null;
  }>;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  return format(new Date(d), "d. MMMM yyyy", { locale: nb });
}

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function HandbokViewer({
  tenantId,
  tenantName,
  orgNumber,
  industry,
  hmsContactName,
  hmsContactPhone,
  handbook,
  stats,
  currentUserId,
  canManage,
  canApprove,
  isEmployee = false,
  suggestions = [],
}: HandbokViewerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"ALL" | "HMS" | "HR">("ALL");
  const [addingHr, setAddingHr] = useState(false);
  const [togglingSection, setTogglingSection] = useState<string | null>(null);
  const [editingRef, setEditingRef] = useState<Record<string, string>>({});
  const [savingRef, setSavingRef] = useState<string | null>(null);
  const currentVersion = handbook.currentVersion;
  const alreadySigned = handbook.signatures.some((s) => s.userId === currentUserId);
  const isDraft = currentVersion?.status === "DRAFT";
  const hasHrSections = currentVersion?.sections.some(
    (s) => s.category === "HR" || s.sectionKey.startsWith("hr-"),
  ) ?? false;

  const visibleSections = (currentVersion?.sections ?? [])
    .filter((section) => !isEmployee || !ADMIN_ONLY_SECTIONS.has(section.sectionKey))
    .filter((section) => !isEmployee || section.isEnabled !== false || !!section.externalRef)
    .filter((section) => {
      if (filter === "ALL") return true;
      const category = section.category ?? (section.sectionKey.startsWith("hr-") ? "HR" : "HMS");
      return category === filter;
    });

  async function handleToggleSection(sectionId: string, enabled: boolean) {
    setTogglingSection(sectionId);
    const result = await toggleSectionEnabled({ sectionId, enabled });
    setTogglingSection(null);
    if (result.success) {
      toast({
        title: enabled ? "Seksjon aktivert" : "Seksjon deaktivert",
        description: enabled
          ? "Seksjonen vises nå for ansatte og i PDF-eksport."
          : "Seksjonen er skjult for ansatte og utelatt fra PDF-eksport.",
      });
      await queryClient.invalidateQueries({ queryKey: ["hms-handbok"] });
      router.refresh();
    } else {
      toast({
        title: "Feil",
        description: result.error,
        variant: "destructive",
      });
    }
  }

  async function handleSaveExternalRef(sectionId: string) {
    setSavingRef(sectionId);
    const value = editingRef[sectionId];
    const result = await updateSectionExternalRef({
      sectionId,
      externalRef: value?.trim() || null,
    });
    setSavingRef(null);
    if (result.success) {
      toast({ title: "Henvisning lagret" });
      setEditingRef((prev) => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["hms-handbok"] });
      router.refresh();
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  async function handleAddHrSections() {
    if (!currentVersion) return;
    setAddingHr(true);
    await ensureHrSections({ versionId: currentVersion.id });
    setAddingHr(false);
    await queryClient.invalidateQueries({ queryKey: ["hms-handbok"] });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Utkast-banner */}
      {isDraft && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Du ser på et utkast (v{currentVersion.version})
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Endringer er ikke publisert. Send til godkjenning når du er ferdig.
            </p>
          </div>
        </div>
      )}

      {/* Topkort: bedriftsinfo + status */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{tenantName}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {orgNumber && <>Org.nr: {orgNumber} · </>}
                  {industry ?? "Alle bransjer"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManage && <HandbokReviewButton tenantId={tenantId} />}
              {canManage && currentVersion && !hasHrSections && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddHrSections}
                  disabled={addingHr}
                >
                  {addingHr ? "Legger til..." : "Legg til personal-kapitler"}
                </Button>
              )}
              <HandbokSignButton
                tenantId={tenantId}
                alreadySigned={alreadySigned}
                versionId={currentVersion?.id}
              />
              {!isEmployee && <TilsynsrapportDialog />}
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href="/api/hms-handbok/pdf" download>
                  <Download className="h-4 w-4" />
                  Last ned PDF
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sist gjennomgått</p>
              <p className="font-medium">{formatDate(handbook.lastReviewedAt)}</p>
              {handbook.reviewedByName && (
                <p className="text-xs text-muted-foreground">av {handbook.reviewedByName}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">HMS-kontakt</p>
              <p className="font-medium">{hmsContactName ?? "Ikke satt"}</p>
              {hmsContactPhone && <p className="text-xs text-muted-foreground">{hmsContactPhone}</p>}
            </div>
            <div>
              <p className="text-muted-foreground">Signaturer</p>
              <p className="font-medium">
                {currentVersion
                  ? `${currentVersion.signatureCount}/${currentVersion.totalEmployees}`
                  : handbook.signatures.length}{" "}
                ansatte
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Åpne avvik (30d)</p>
              <p className={`font-medium ${stats.openIncidentsLast30d > 0 ? "text-amber-600" : "text-green-600"}`}>
                {stats.openIncidentsLast30d}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Versjonskontroll */}
      {currentVersion && (
        <HandbokVersionBar
          tenantId={tenantId}
          version={currentVersion}
          canManage={canManage}
          canApprove={canApprove}
        />
      )}

      {/* Dynamiske seksjoner */}
      {currentVersion && currentVersion.sections.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Innhold i HMS- og personalhåndbok – v{currentVersion.version}
            </h2>
            <div className="flex gap-1">
              {([
                { id: "ALL", label: "Alle" },
                { id: "HMS", label: "HMS" },
                { id: "HR", label: "Personal" },
              ] as const).map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  size="sm"
                  variant={filter === tab.id ? "default" : "outline"}
                  className={filter !== tab.id ? "bg-transparent" : undefined}
                  onClick={() => setFilter(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
          {visibleSections.map((section) => {
            const isDisabled = section.isEnabled === false;
            const showRefOnly = isEmployee && isDisabled && !!section.externalRef;

            return (
              <div key={section.id} className={cn(isDisabled && !showRefOnly && "opacity-60")}>
                {isDraft && canManage && (
                  <div className="space-y-0">
                    <div className="flex items-center justify-between rounded-t-lg border border-b-0 bg-muted/50 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!isDisabled}
                          disabled={togglingSection === section.id}
                          onCheckedChange={(checked) => handleToggleSection(section.id, checked)}
                          className="scale-90"
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {!isDisabled
                            ? "Synlig for ansatte"
                            : "Skjult for ansatte"}
                        </span>
                      </div>
                      {isDisabled && (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                          Deaktivert
                        </Badge>
                      )}
                    </div>
                    {isDisabled && (
                      <div className="flex items-center gap-2 border border-b-0 border-t-0 bg-amber-50/50 px-4 py-2">
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Input
                          placeholder="Henvisning til eksternt system, f.eks. «Se personalhåndbok i Simployer» eller en URL"
                          value={editingRef[section.id] ?? section.externalRef ?? ""}
                          onChange={(e) =>
                            setEditingRef((prev) => ({ ...prev, [section.id]: e.target.value }))
                          }
                          className="h-8 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0"
                          disabled={
                            savingRef === section.id ||
                            (editingRef[section.id] === undefined && !section.externalRef) ||
                            (editingRef[section.id] ?? section.externalRef ?? "") === (section.externalRef ?? "")
                          }
                          onClick={() => handleSaveExternalRef(section.id)}
                        >
                          <Save className="mr-1 h-3 w-3" />
                          {savingRef === section.id ? "Lagrer..." : "Lagre"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {showRefOnly ? (
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="flex items-start gap-3 py-4">
                      <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {section.sectionNumber}. {section.title}
                        </p>
                        <p className="mt-1 text-sm text-blue-700">
                          {section.externalRef}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <HandbokSectionExpanded
                    section={section}
                    versionStatus={currentVersion.status}
                    canEdit={canManage}
                    annualPlanProgress={stats.annualPlanProgress}
                    legalRequirements={stats.legalRequirements}
                    suggestions={suggestions.filter(
                      (s) => s.targetSectionKey === section.sectionKey,
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">Ingen seksjoner ennå</p>
            <p className="mt-1 text-xs text-muted-foreground">
              HMS Håndboken har ikke fått innhold ennå. Kontakt support for å importere en bransje-mal.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Signaturliste */}
      {handbook.signatures.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4" />
              Signaturer ({handbook.signatures.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ansatte som har bekreftet at de har lest og forstått håndboken.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {handbook.signatures.slice(0, 10).map((sig) => (
                <div key={sig.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {initials(sig.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{sig.userName ?? sig.userEmail}</p>
                      {sig.comment && (
                        <p className="text-xs text-muted-foreground">{sig.comment}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {format(new Date(sig.signedAt), "d. MMM yyyy", { locale: nb })}
                  </span>
                </div>
              ))}
              {handbook.signatures.length > 10 && (
                <p className="pt-1 text-xs text-muted-foreground">
                  + {handbook.signatures.length - 10} flere
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {handbook.signatures.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <PenLine className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">Ingen signaturer ennå</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ansatte kan signere for å bekrefte at de har lest håndboken.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
