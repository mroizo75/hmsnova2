"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  applyAiRiskSuggestionsForTenant,
  previewAiRiskSuggestionsForTenant,
  reprovisionTenantIndustryPackage,
} from "@/server/actions/tenant.actions";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AiSuggestionItem {
  title: string;
  severity: string;
  category: string;
  rationale: string;
  isDuplicate: boolean;
}

interface IndustryPackageActionsProps {
  tenantId: string;
  hasPackage: boolean;
}

export function IndustryPackageActions({
  tenantId,
  hasPackage,
}: IndustryPackageActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isReprovisioning, setIsReprovisioning] = useState(false);
  const [isPreviewingAi, setIsPreviewingAi] = useState(false);
  const [isApplyingAi, setIsApplyingAi] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());

  const handleReprovision = async () => {
    setIsReprovisioning(true);
    try {
      const result = await reprovisionTenantIndustryPackage(tenantId);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Kunne ikke re-kjøre provisionering",
          description: result.error || "Ukjent feil",
        });
        return;
      }

      toast({
        title: "Provisionering fullført",
        description: "Manglende elementer i bransjepakken er opprettet.",
      });
      router.refresh();
    } finally {
      setIsReprovisioning(false);
    }
  };

  const handleGenerateAi = async () => {
    setIsPreviewingAi(true);
    try {
      const result = await previewAiRiskSuggestionsForTenant(tenantId);
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
        title: "AI-forslag klare for godkjenning",
        description: `${previewSuggestions.length} forslag hentet.`,
      });
    } finally {
      setIsPreviewingAi(false);
    }
  };

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

  const handleApplySelected = async () => {
    const selectedSuggestions = suggestions.filter((suggestion) =>
      selectedTitles.has(suggestion.title)
    );

    if (selectedSuggestions.length === 0) {
      toast({
        variant: "destructive",
        title: "Ingen forslag valgt",
        description: "Velg minst ett forslag før lagring.",
      });
      return;
    }

    setIsApplyingAi(true);
    try {
      const result = await applyAiRiskSuggestionsForTenant({
        tenantId,
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
      setIsApplyingAi(false);
    }
  };

  if (!hasPackage) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleReprovision}
        disabled={isReprovisioning || isPreviewingAi || isApplyingAi}
      >
        {isReprovisioning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Re-kjører provisionering...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-kjør provisionering
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleGenerateAi}
        disabled={isPreviewingAi || isReprovisioning || isApplyingAi}
      >
        {isPreviewingAi ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Henter AI-forslag...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Forhåndsvis AI-risikoforslag
          </>
        )}
      </Button>

      {suggestions.length > 0 && (
        <div className="rounded-md border p-3 space-y-3">
          <p className="text-sm font-medium">Godkjenn forslag før lagring</p>
          <div className="space-y-2 max-h-64 overflow-auto">
            {suggestions.map((suggestion) => {
              const checked = selectedTitles.has(suggestion.title);
              return (
                <div key={suggestion.title} className="flex items-start gap-2">
                  <Checkbox
                    id={`ai-${suggestion.title}`}
                    checked={checked}
                    onCheckedChange={(value) => toggleSelected(suggestion.title, value === true)}
                    disabled={suggestion.isDuplicate || isApplyingAi}
                  />
                  <label
                    htmlFor={`ai-${suggestion.title}`}
                    className={`text-sm leading-5 ${
                      suggestion.isDuplicate ? "text-muted-foreground" : ""
                    }`}
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

          <Button
            type="button"
            className="w-full"
            onClick={handleApplySelected}
            disabled={isApplyingAi || isReprovisioning}
          >
            {isApplyingAi ? (
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
    </div>
  );
}
