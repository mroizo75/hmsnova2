"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Shield, TrendingUp } from "lucide-react";
import { updateIntelligenceConsent } from "@/server/actions/intelligence-consent.actions";

interface ConsentToggleProps {
  initialOptedIn: boolean;
  isAdmin: boolean;
}

export function IntelligenceConsentToggle({ initialOptedIn, isAdmin }: ConsentToggleProps) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    if (!isAdmin) return;

    setOptedIn(checked);
    startTransition(async () => {
      const result = await updateIntelligenceConsent(checked);
      if (!result.success) {
        setOptedIn(!checked);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Bransjestatistikk og benchmark
            </CardTitle>
            <CardDescription className="mt-1">
              Delta i anonymisert bransjestatistikk og se hvordan din bedrift presterer sammenlignet med andre i samme bransje.
            </CardDescription>
          </div>
          {optedIn && (
            <Badge variant="secondary" className="shrink-0">Aktiv</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Shield className="mt-0.5 h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-medium">Anonymisert</p>
              <p className="text-xs text-muted-foreground">
                Kun aggregerte tall deles — bedriftsnavn og persondata er aldri synlig for andre.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <TrendingUp className="mt-0.5 h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium">Benchmark</p>
              <p className="text-xs text-muted-foreground">
                Se din compliance-score, TRIR og responstid sammenlignet med bransjesnittet.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <BarChart3 className="mt-0.5 h-5 w-5 text-purple-600 shrink-0" />
            <div>
              <p className="text-sm font-medium">Innsikt</p>
              <p className="text-xs text-muted-foreground">
                Få tilgang til bransjerapporter, trender og tidlig varsling om nye risikoer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="intelligence-consent" className="text-base font-medium">
              Delta i bransjestatistikk
            </Label>
            <p className="text-sm text-muted-foreground">
              Aktivert som standard. Data anonymiseres med k-anonymity (minimum 5 bedrifter per bransjegruppe).
              Du kan skru av deltakelsen nar som helst.
            </p>
          </div>
          <Switch
            id="intelligence-consent"
            checked={optedIn}
            onCheckedChange={handleToggle}
            disabled={!isAdmin || isPending}
          />
        </div>

        {!isAdmin && (
          <p className="text-sm text-muted-foreground italic">
            Kun administrator kan endre denne innstillingen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
