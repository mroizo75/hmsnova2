"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TipTapEditor } from "@/components/admin/tiptap-editor";
import {
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Save,
  X,
  Lightbulb,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { updateDraftSection } from "@/server/actions/hms-handbok.actions";
import type {
  HandbookSectionData,
  AnnualPlanProgress,
  LegalRequirementForHandbook,
} from "@/server/actions/hms-handbok.actions";
import type { HandbookVersionStatus } from "@prisma/client";
import { HandbokAnnualPlan } from "./handbok-annual-plan";

interface HandbokSectionExpandedProps {
  section: HandbookSectionData;
  versionStatus: HandbookVersionStatus;
  canEdit: boolean;
  annualPlanProgress?: AnnualPlanProgress | null;
  legalRequirements?: LegalRequirementForHandbook[];
  suggestions?: Array<{
    id: string;
    title: string;
    description: string;
    legalBasis: string | null;
    priority: number;
  }>;
}

export function HandbokSectionExpanded({
  section,
  versionStatus,
  canEdit,
  annualPlanProgress,
  legalRequirements = [],
  suggestions = [],
}: HandbokSectionExpandedProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(section.content);
  const [displayContent, setDisplayContent] = useState(section.content);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isDraft = versionStatus === "DRAFT";
  const sectionSuggestions = suggestions.filter(
    (s) => s.id, // Already filtered by parent
  );

  async function handleSave() {
    setSaving(true);
    const result = await updateDraftSection({
      sectionId: section.id,
      content: editContent,
    });
    setSaving(false);
    if (result.success) {
      toast({ title: "Seksjon oppdatert" });
      setDisplayContent(editContent);
      setEditing(false);
    } else {
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    }
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div
            className="flex flex-1 cursor-pointer items-start gap-3"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {section.sectionNumber}
            </span>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base">
                {section.title}
                {section.category === "HR" && (
                  <Badge variant="outline" className="text-xs font-normal">Personal</Badge>
                )}
                {sectionSuggestions.length > 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Lightbulb className="h-3 w-3" />
                    {sectionSuggestions.length} forslag
                  </Badge>
                )}
              </CardTitle>
              {section.legalRef && (
                <Badge variant="outline" className="mt-1.5 text-xs font-normal">
                  {section.legalRef}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {section.moduleLink && (
              <Button asChild variant="ghost" size="sm" className="shrink-0 gap-1.5">
                <Link href={section.moduleLink}>
                  Åpne
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Innhold */}
          {editing && isDraft ? (
            <div className="space-y-3">
              <TipTapEditor
                content={editContent}
                onChange={(html) => setEditContent(html)}
                placeholder="Skriv innholdet for denne seksjonen..."
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Lagre
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setEditContent(displayContent);
                  }}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Avbryt
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
              {isDraft && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => {
                    setEditContent(displayContent);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rediger
                </Button>
              )}
            </div>
          )}

          {/* Live årshjul (kun for seksjon s13) */}
          {section.sectionKey === "s13" && annualPlanProgress && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <HandbokAnnualPlan progress={annualPlanProgress} />
            </div>
          )}

          {/* Live lovkrav fra regelverksmotor (seksjon s2c – punkt 4) */}
          {section.sectionKey === "s2c" && legalRequirements.length > 0 && (() => {
            const activeReqs = legalRequirements.filter((r) => r.status !== "NOT_APPLICABLE");
            const naReqs = legalRequirements.filter((r) => r.status === "NOT_APPLICABLE");
            return (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Identifiserte lovkrav ({activeReqs.length})
                  </p>
                  <Link
                    href="/dashboard/juridisk-register"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Se fullstendig register
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {activeReqs.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2.5 rounded-md bg-background border px-3 py-2"
                    >
                      {req.status === "COMPLIANT" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      ) : req.status === "PARTIAL" ? (
                        <Lightbulb className="h-4 w-4 shrink-0 text-yellow-600" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{req.title}</p>
                          {req.isCustom && (
                            <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Egendefinert
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{req.legalBasis}</p>
                      </div>
                      {req.hmsNovaRoute && (
                        <Link
                          href={req.hmsNovaRoute}
                          className="shrink-0 text-xs text-primary hover:underline"
                        >
                          Åpne
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
                {activeReqs.some((r) => r.status === "MISSING") && (
                  <p className="text-xs text-muted-foreground">
                    Krav merket med rødt mangler dokumentasjon eller tiltak i HMS Nova.{" "}
                    <Link href="/dashboard/juridisk-register" className="text-primary hover:underline">
                      Gå til juridisk register
                    </Link>{" "}
                    for detaljer.
                  </p>
                )}
                {naReqs.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {naReqs.length} krav er merket som ikke relevante for virksomheten.
                  </p>
                )}
              </div>
            );
          })()}

          {section.sectionKey === "s2c" && legalRequirements.length === 0 && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ingen lovkrav er kartlagt ennå.{" "}
                <Link href="/dashboard/juridisk-register" className="text-primary hover:underline">
                  Kartlegg regelverk
                </Link>{" "}
                for å automatisk identifisere gjeldende lover og forskrifter.
              </p>
            </div>
          )}

          {/* Inline forbedringsforslag */}
          {sectionSuggestions.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
                <Lightbulb className="h-4 w-4" />
                Forbedringsforslag fra HMS-motoren
              </p>
              {sectionSuggestions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border border-amber-300 bg-white p-2.5 dark:border-amber-700 dark:bg-amber-950/30"
                >
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                  {s.legalBasis && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      {s.legalBasis}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Underseksjoner */}
          {section.children.length > 0 && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {section.children.map((child) => (
                <HandbokSectionExpanded
                  key={child.id}
                  section={child}
                  versionStatus={versionStatus}
                  canEdit={canEdit}
                  suggestions={[]}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
