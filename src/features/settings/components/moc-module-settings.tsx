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
import { updateMocModuleEnabled } from "@/server/actions/settings.actions";
import { Info, GitBranch } from "lucide-react";

interface MocModuleSettingsProps {
  initialEnabled: boolean;
  isAdmin: boolean;
  recommended: boolean;
}

export function MocModuleSettings({
  initialEnabled,
  isAdmin,
  recommended,
}: MocModuleSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setLoading(true);
    const result = await updateMocModuleEnabled(next);
    setLoading(false);

    if (result.success) {
      toast({
        title: next ? "Endringsledelse er slått på" : "Endringsledelse er slått av",
        description: next
          ? "Alle roller får flyten for å foreslå, godkjenne og verifisere endringer."
          : "Menyen og flyten er skjult. Eksisterende saker beholdes.",
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
          <GitBranch className="h-5 w-5" />
          Endringsledelse (MoC)
        </CardTitle>
        <CardDescription>
          Formell styring av planlagte og utilsiktede endringer som påvirker HMS, jf. ISO 45001 krav 8.1.3
          og internkontrollforskriften § 5 nr. 2 og nr. 6.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor="moc-module-enabled" className="text-base">
              Bruk endringsledelse
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Ansatte kan foreslå endringer. HMS og leder godkjenner før iverksetting."
                : "Modulen er av. Risikovurdering og tiltak brukes manuelt ved endringer."}
            </p>
          </div>
          <Switch
            id="moc-module-enabled"
            checked={enabled}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 flex gap-2 text-sm text-blue-900 dark:text-blue-100">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {recommended
              ? "Anbefalt på for din bransje (prosess, bygg, elektro, maritim eller tilsvarende)."
              : "Anbefalt ved ISO 45001/9001 og når endringer skal godkjennes før de iverksettes."}{" "}
            Personkonflikter og varsling går fortsatt i varslingsmodulen, ikke her.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
