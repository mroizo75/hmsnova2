"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminAiIncludedSwitch } from "@/features/admin/components/admin-ai-included-switch";
import { AI_ADDON_NET_MONTHLY_NOK, getTenantAiSource } from "@/lib/ai-addon";
import { Sparkles } from "lucide-react";

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
  const source = getTenantAiSource({ aiEnabled, aiIncludedInAgreement });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI
          {source === "self" ? (
            <Badge>Skal faktureres</Badge>
          ) : source === "agreement" ? (
            <Badge variant="secondary">I avtale</Badge>
          ) : (
            <Badge variant="secondary">Ikke aktiv</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {source === "self"
            ? `${tenantName} har skrudd på AI selv. Legg ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva på fakturaen.`
            : source === "agreement"
              ? "AI inngår i avtalen. Ikke fakturer AI-tillegget."
              : "Bedriften har ikke skrudd på AI. Overstyring under er noe annet enn kundens eget valg."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Overstyr avtale</p>
            <p className="text-sm text-muted-foreground">
              Legger AI inn uten tillegg. Krever bekreftelse, og er ikke det samme som at kunden har skrudd på AI selv.
            </p>
          </div>
          <AdminAiIncludedSwitch
            tenantId={tenantId}
            tenantName={tenantName}
            included={aiIncludedInAgreement}
          />
        </div>
      </CardContent>
    </Card>
  );
}
