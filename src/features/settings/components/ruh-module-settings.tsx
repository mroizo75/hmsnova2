"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { updateRuhModuleEnabled } from "@/server/actions/settings.actions";
import { Info, SplitSquareHorizontal } from "lucide-react";

interface RuhModuleSettingsProps {
  initialEnabled: boolean;
  isAdmin: boolean;
}

export function RuhModuleSettings({ initialEnabled, isAdmin }: RuhModuleSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setLoading(true);
    const result = await updateRuhModuleEnabled(next);
    setLoading(false);

    if (result.success) {
      toast({
        title: next ? "RUH er slått på" : "RUH er slått av",
        description: next
          ? "Ansatte kan igjen registrere RUH ved siden av avvik."
          : "Alt registreres nå som avvik. Tidligere RUH-rapporter er fortsatt tilgjengelige.",
      });
      router.refresh();
    } else {
      setEnabled(!next);
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre",
        description: result.error,
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SplitSquareHorizontal className="h-5 w-5" />
          Skal RUH brukes ved siden av avvik?
        </CardTitle>
        <CardDescription>
          Noen virksomheter registrerer alt som avvik, andre skiller ut uønskede hendelser i et eget
          RUH-spor. Velg det som passer deres praksis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor="ruh-module-enabled" className="text-base">
              RUH som eget spor
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Ansatte velger mellom Avvik og RUH når de melder inn."
                : "Ansatte melder alt som avvik, med type HMS, Kvalitet, Miljø eller Kundeklage."}
            </p>
          </div>
          <Switch
            id="ruh-module-enabled"
            checked={enabled}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 flex gap-2 text-sm text-blue-900 dark:text-blue-100">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Slår du av RUH, forsvinner menyvalget og innsendingsskjemaet, men allerede registrerte
            RUH-rapporter kan fortsatt leses og behandles. Meldeplikten etter arbeidsmiljøloven
            § 5-2 dekkes uansett av avvikstypene arbeidsulykke og nestenulykke.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
