"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { applyAiRiskSuggestions, previewAiRiskSuggestions } from "@/server/actions/risk.actions";

interface AiSuggestionItem {
  title: string;
  severity: string;
  category: string;
  rationale: string;
  isDuplicate: boolean;
}

export function AiRiskSuggestionsCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());

  const toggleSelected = (title: string, checked: boolean) => {
    setSelectedTitles((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(title);
      } else {
        next.delete(title);
      }
      return next;
    });
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
      const defaults = new Set(
        previewSuggestions
          .filter((suggestion) => !suggestion.isDuplicate)
          .map((suggestion) => suggestion.title)
      );
      setSuggestions(previewSuggestions);
      setSelectedTitles(defaults);
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
      suggestions.filter((suggestion) => !suggestion.isDuplicate).map((suggestion) => suggestion.title)
    );
    setSelectedTitles(next);
  };

  const handleClearAll = () => {
    setSelectedTitles(new Set());
  };

  const handleApply = async () => {
    const selectedSuggestions = suggestions.filter((suggestion) => selectedTitles.has(suggestion.title));
    if (selectedSuggestions.length === 0) {
      toast({
        variant: "destructive",
        title: "Ingen forslag valgt",
        description: "Velg minst ett forslag før lagring.",
      });
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyAiRiskSuggestions({
        suggestions: selectedSuggestions.map((suggestion) => ({
          title: suggestion.title,
          severity: suggestion.severity,
          category: suggestion.category,
        })),
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
      setSelectedTitles(new Set());
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
          Hent forslag basert på bransje og historikk, og godkjenn manuelt før lagring.
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
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleSelectAllNew} disabled={isApplying}>
                Velg alle nye
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearAll} disabled={isApplying}>
                Fjern alle
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {suggestions.map((suggestion) => {
                const checked = selectedTitles.has(suggestion.title);
                return (
                  <div key={suggestion.title} className="flex items-start gap-2">
                    <Checkbox
                      id={`risk-ai-${suggestion.title}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleSelected(suggestion.title, value === true)}
                      disabled={suggestion.isDuplicate || isApplying}
                    />
                    <label
                      htmlFor={`risk-ai-${suggestion.title}`}
                      className={`text-sm leading-5 ${suggestion.isDuplicate ? "text-muted-foreground" : ""}`}
                    >
                      <span className="font-medium">{suggestion.title}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        ({suggestion.severity}/{suggestion.category})
                        {suggestion.isDuplicate ? " - finnes allerede" : ""}
                      </span>
                      {suggestion.rationale && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          Begrunnelse: {suggestion.rationale}
                        </span>
                      )}
                    </label>
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
