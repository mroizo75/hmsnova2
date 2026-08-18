import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, PenLine, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { HandbokSectionExpanded } from "./handbok-section-expanded";
import { HandbokVersionBar } from "./handbok-version-bar";
import { HandbokSignButton } from "./handbok-sign-button";
import { HandbokReviewButton } from "./handbok-review-button";
import type {
  HandbookData,
  LiveHandbookStats,
} from "@/server/actions/hms-handbok.actions";

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
  suggestions = [],
}: HandbokViewerProps) {
  const currentVersion = handbook.currentVersion;
  const alreadySigned = handbook.signatures.some((s) => s.userId === currentUserId);
  const isDraft = currentVersion?.status === "DRAFT";

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
              <HandbokSignButton
                tenantId={tenantId}
                alreadySigned={alreadySigned}
                versionId={currentVersion?.id}
              />
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Innhold i HMS Håndbok – v{currentVersion.version}
          </h2>
          {currentVersion.sections.map((section) => (
            <HandbokSectionExpanded
              key={section.id}
              section={section}
              versionStatus={currentVersion.status}
              canEdit={canManage}
              annualPlanProgress={stats.annualPlanProgress}
              suggestions={suggestions.filter(
                (s) => s.targetSectionKey === section.sectionKey,
              )}
            />
          ))}
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
              Ansatte som har bekreftet at de har lest og forstått HMS-håndboken.
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
              Ansatte kan signere for å bekrefte at de har lest HMS-håndboken.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
