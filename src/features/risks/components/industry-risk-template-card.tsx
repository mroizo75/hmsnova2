"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { applyIndustryRiskTemplate } from "@/server/actions/industry-provision.actions";

interface IndustryRiskTemplateCardProps {
  industryLabel: string;
  isEmpty: boolean;
}

export function IndustryRiskTemplateCard({
  industryLabel,
  isEmpty,
}: IndustryRiskTemplateCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    try {
      const result = await applyIndustryRiskTemplate();
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Kunne ikke hente bransjemal",
          description: result.error || "Ukjent feil",
        });
        return;
      }
      if (result.skipped) {
        toast({
          title: "Ingen bransjemal",
          description: result.message || "Det finnes ikke en ferdig mal for denne bransjen.",
        });
        return;
      }
      toast({
        title: "Bransjemal lagt inn",
        description: `Risikopunkter for ${industryLabel} er lagt inn. Tilpass dem til egen virksomhet før godkjenning.`,
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Bransjemal for risikovurdering
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {isEmpty
            ? `Start med ferdig mal for ${industryLabel}. Dette er et utgangspunkt – dere må tilpasse til egen virksomhet (AML § 3-1 og internkontrollforskriften § 5).`
            : `Legg inn manglende risikopunkter fra malen for ${industryLabel}. Eksisterende punkter overskrives ikke.`}
        </p>
        <Button type="button" onClick={() => void handleApply()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Henter mal...
            </>
          ) : (
            `Bruk bransjemal for ${industryLabel}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
