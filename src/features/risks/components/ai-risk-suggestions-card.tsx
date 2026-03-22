"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { applyAiRiskSuggestions, previewAiRiskSuggestions } from "@/server/actions/risk.actions";

interface LocalAiSuggestion {
  id: string;
  sourceTitle: string;
  title: string;
  severity: string;
  category: string;
  rationale: string;
  isDuplicate: boolean;
}

function isDuplicateLocked(s: LocalAiSuggestion): boolean {
  return (
    s.isDuplicate && s.title.trim().toLowerCase() === s.sourceTitle.trim().toLowerCase()
  );
}

export function AiRiskSuggestionsCard() {
  const router = useRouter();
  const { toast } = useToast();
  const defaultYear = useMemo(() => new Date().getFullYear(), []);
  const defaultAssessmentTitle = useMemo(() => `Risikovurdering ${defaultYear}`, [defaultYear]);

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<LocalAiSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assessmentTitle, setAssessmentTitle] = useState(defaultAssessmentTitle);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const setRowTitle = (id: string, title: string) => {
    setSuggestions((previous) => previous.map((row) => (row.id === id ? { ...row, title } : row)));
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const result = await previewAiRiskSuggestions();
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Kunne ikke hente AI-forslag",
          description: result.error || "Ukjent feil",
        });
        return;
      }

      const previewSuggestions = result.data?.suggestions ?? [];
      const rows: LocalAiSuggestion[] = previewSuggestions.map((suggestion) => ({
        id: crypto.randomUUID(),
        sourceTitle: suggestion.title,
        title: suggestion.title,
        severity: suggestion.severity,
        category: suggestion.category,
        rationale: suggestion.rationale,
        isDuplicate: suggestion.isDuplicate,
      }));

      const defaults = new Set(
        rows.filter((row) => !isDuplicateLocked(row)).map((row) => row.id)
      );
      setSuggestions(rows);
      setSelectedIds(defaults);
      setAssessmentTitle(defaultAssessmentTitle);
      toast({
        title: "AI-forslag klare",
        description: `${previewSuggestions.length} forslag hentet for gjennomgang.`,
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSelectAllNew = () => {
    const next = new Set(
      suggestions.filter((row) => !isDuplicateLocked(row)).map((row) => row.id)
    );
    setSelectedIds(next);
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = async () => {
    const trimmedAssessment = assessmentTitle.trim();
    if (trimmedAssessment.length < 2) {
      toast({
        variant: "destructive",
        title: "Tittel mangler",
        description: "Fyll inn tittel på risikovurderingen før lagring.",
      });
      return;
    }

    const selectedRows = suggestions.filter((row) => selectedIds.has(row.id));
    const payload = selectedRows
      .map((row) => ({
        title: row.title.trim(),
        severity: row.severity,
        category: row.category,
      }))
      .filter((row) => row.title.length >= 2);

    if (payload.length === 0) {
      toast({
        variant: "destructive",
        title: "Ingen gyldige forslag",
        description: "Velg minst ett forslag og sørg for at tittel har minst 2 tegn.",
      });
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyAiRiskSuggestions({
        assessmentTitle: trimmedAssessment,
        suggestions: payload,
      });
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Kunne ikke lagre AI-forslag",
          description: result.error || "Ukjent feil",
        });
        return;
      }

      const created = result.data?.created ?? 0;
      const skipped = result.data?.skipped ?? 0;
      toast({
        title: "AI-risikoforslag lagret",
        description: `${created} opprettet, ${skipped} hoppet over.`,
      });
      setSuggestions([]);
      setSelectedIds(new Set());
      setAssessmentTitle(defaultAssessmentTitle);
      router.refresh();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          AI-forslag for risikovurdering
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Hent forslag basert på bransje og historikk. Juster tittel på årsvurderingen og hvert
          risikopunkt før du lagrer – AI er kun et utgangspunkt.
        </p>

        <Button type="button" variant="secondary" onClick={handlePreview} disabled={isPreviewing || isApplying}>
          {isPreviewing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Henter forslag...
            </>
          ) : (
            "Forhåndsvis AI-forslag"
          )}
        </Button>

        {suggestions.length > 0 && (
          <div className="rounded-md border p-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="risk-ai-assessment-title">Tittel på risikovurdering (år)</Label>
              <Input
                id="risk-ai-assessment-title"
                value={assessmentTitle}
                onChange={(e) => setAssessmentTitle(e.target.value)}
                placeholder={defaultAssessmentTitle}
                disabled={isApplying}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Forslagene knyttes til denne vurderingen. Bruk et navn dere står inne for i internkontroll
                og ved revisjon.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleSelectAllNew} disabled={isApplying}>
                Velg alle nye
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearAll} disabled={isApplying}>
                Fjern alle
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-auto">
              {suggestions.map((row) => {
                const locked = isDuplicateLocked(row);
                const checked = selectedIds.has(row.id);
                return (
                  <div key={row.id} className="rounded-md border bg-muted/20 p-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id={`risk-ai-${row.id}`}
                        checked={checked}
                        onCheckedChange={(value) => toggleSelected(row.id, value === true)}
                        disabled={locked || isApplying}
                        className="mt-2"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="space-y-1">
                          <Label htmlFor={`risk-ai-title-${row.id}`} className="text-xs text-muted-foreground">
                            Tittel på risikopunkt
                          </Label>
                          <Input
                            id={`risk-ai-title-${row.id}`}
                            value={row.title}
                            onChange={(e) => setRowTitle(row.id, e.target.value)}
                            disabled={isApplying}
                            maxLength={500}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {row.severity}/{row.category}
                          {locked ? " – samme tittel finnes allerede (endre tittel for å velge)" : ""}
                        </p>
                        {row.rationale ? (
                          <p className="text-xs text-muted-foreground">Begrunnelse: {row.rationale}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button type="button" onClick={handleApply} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Lagrer valgte forslag...
                </>
              ) : (
                "Lagre valgte forslag"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
