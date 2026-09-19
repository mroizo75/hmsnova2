"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toggleAiIncludedInAgreement } from "@/server/actions/tenant.actions";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

interface AdminAiIncludedCardProps {
  tenantId: string;
  tenantName: string;
  aiEnabled: boolean;
  aiIncludedInAgreement: boolean;
}

export function AdminAiIncludedCard({
  tenantId,
  tenantName,
  aiEnabled,
  aiIncludedInAgreement,
}: AdminAiIncludedCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleToggle(included: boolean) {
    setLoading(true);
    const result = await toggleAiIncludedInAgreement(tenantId, included);
    setLoading(false);

    if (result.success) {
      toast({
        title: included ? "AI inkludert i avtalen" : "AI-inkludering fjernet",
        description: included
          ? `${tenantName} har AI som standard uten ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd tillegg.`
          : "AI er slått av. Bedriften kan aktivere det som betalt tillegg i innstillinger.",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre",
        description: result.error || "Noe gikk galt",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI i avtalen
          {aiIncludedInAgreement ? (
            <Badge>Inkludert</Badge>
          ) : aiEnabled ? (
            <Badge variant="secondary">Betalt tillegg</Badge>
          ) : (
            <Badge variant="secondary">Av</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Overstyr for NHO- og andre avtaler der AI inngår som standard. Ingen {AI_ADDON_NET_MONTHLY_NOK} kr/mnd på
          fakturaen når dette er på.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor={`ai-included-${tenantId}`} className="text-base">
              Inkluder AI uten tillegg
            </Label>
            <p className="text-sm text-muted-foreground">
              {aiIncludedInAgreement
                ? `AI er på og inngår i avtalen. Kunden belastes ikke ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd.`
                : "Standard: kunden må selv aktivere AI som betalt tillegg."}
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id={`ai-included-${tenantId}`}
              checked={aiIncludedInAgreement}
              disabled={loading}
              onCheckedChange={(next) => {
                void handleToggle(next);
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
