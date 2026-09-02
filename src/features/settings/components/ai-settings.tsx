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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { updateAiSettings } from "@/server/actions/settings.actions";
import { Info, Sparkles } from "lucide-react";

interface AiSettingsProps {
  initialEnabled: boolean;
  isAdmin: boolean;
}

export function AiSettings({ initialEnabled, isAdmin }: AiSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setLoading(true);
    const result = await updateAiSettings(next);
    setLoading(false);

    if (result.success) {
      toast({
        title: next ? "AI-funksjoner er slått på" : "AI-funksjoner er slått av",
        description: next
          ? "Avviksutkast, risikoforslag og andre AI-funksjoner er tilgjengelige igjen."
          : "AI-forslag vises ikke lenger noe sted i HMS Nova for deres virksomhet.",
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
          <Sparkles className="h-5 w-5" />
          Kunstig intelligens (AI)
          <Badge variant="secondary">Testfase</Badge>
        </CardTitle>
        <CardDescription>
          HMS Nova kan bruke AI (OpenAI) til å foreslå avviksutkast, risikoer, tiltak og
          oppsummeringer. Alle AI-funksjoner er i dag i testfase og helt valgfrie å bruke.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor="ai-enabled" className="text-base">
              Bruk AI-funksjoner
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "AI-forslag vises i avvik, risikovurdering, SJA, vernerunder og stoffkartotek."
                : "Ingen AI-forslag vises noe sted. Alt registreres og behandles manuelt som normalt."}
            </p>
          </div>
          <Switch
            id="ai-enabled"
            checked={enabled}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 flex gap-2 text-sm text-blue-900 dark:text-blue-100">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Ingen ekstra kostnad i dag - dette er kun en av/på-bryter i testfasen. Data dere sender
            til AI-funksjonen (bransje, fritekst, evt. bilder/SDS-dokumenter) brukes ikke til å
            trene OpenAIs modeller. Slår dere av AI, brukes ikke tjenesten i det hele tatt for
            deres virksomhet.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
