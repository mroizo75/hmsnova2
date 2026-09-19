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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { updateAiSettings } from "@/server/actions/settings.actions";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";
import { invalidateTenantNavCache } from "@/hooks/use-tenant-nav-context";
import { Info, Mic, Sparkles } from "lucide-react";

interface AiSettingsProps {
  initialEnabled: boolean;
  includedInAgreement?: boolean;
  activatedAt?: string | Date | null;
  isAdmin: boolean;
}

export function AiSettings({
  initialEnabled,
  includedInAgreement = false,
  activatedAt,
  isAdmin,
}: AiSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState(false);

  const persist = async (next: boolean) => {
    setEnabled(next);
    setLoading(true);
    const result = await updateAiSettings(next);
    setLoading(false);

    if (result.success) {
      invalidateTenantNavCache();
      toast({
        title: next ? "AI er aktivert" : "AI er slått av",
        description: next
          ? includedInAgreement
            ? "AI inngår i avtalen. Ingen ekstra kostnad."
            : `${AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva legges til neste faktura.`
          : includedInAgreement
            ? "AI er av. Dere kan slå det på igjen uten ekstra kostnad."
            : "AI er av med en gang. Ingen AI-linje på neste faktura.",
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

  const handleToggle = (next: boolean) => {
    setPendingEnabled(next);
    setConfirmOpen(true);
  };

  if (!isAdmin) {
    return null;
  }

  const activatedLabel = activatedAt
    ? new Date(activatedAt).toLocaleDateString("nb-NO")
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Kunstig intelligens (AI)
            {includedInAgreement ? (
              <Badge>Inkludert i avtalen</Badge>
            ) : enabled ? (
              <Badge>Aktivt tillegg</Badge>
            ) : (
              <Badge variant="secondary">Av</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {includedInAgreement
              ? "AI inngår i avtalen deres. Ingen 99 kr/mnd tillegg. Dere kan slå av bruken uten å miste inkluderingen."
              : `Valgfritt tillegg: ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva. Inkluderer chat-hjelp, avviksutkast, oppsummeringer, SDS-tolkning, tale-til-tekst og valgfrie risikoforslag. Alltid av som standard.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
            <div className="space-y-1">
              <Label htmlFor="ai-enabled" className="text-base">
                Aktiver AI
              </Label>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? includedInAgreement
                    ? `AI er på og inngår i avtalen. Ingen ekstra fakturalinje.${activatedLabel ? ` Aktivert ${activatedLabel}.` : ""}`
                    : `AI er på. ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva på fakturaen.${activatedLabel ? ` Aktivert ${activatedLabel}.` : ""}`
                  : includedInAgreement
                    ? "AI er av. Dere kan slå det på uten ekstra kostnad."
                    : "AI er av. Ingen OpenAI-kall og ingen ekstra kostnad."}
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={enabled}
              disabled={loading}
              onCheckedChange={handleToggle}
            />
          </div>

          <div className="rounded-lg border bg-card p-3 flex gap-2 text-sm text-muted-foreground">
            <Mic className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Tale-til-tekst på avvik, SJA, RUH, vernerunder og skjemaer er inkludert når AI er
              aktivert. Lyd lagres ikke – kun teksten dere godkjenner i skjemaet.
            </span>
          </div>

          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 flex gap-2 text-sm text-blue-900 dark:text-blue-100">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Data som sendes til AI (bransje, fritekst, evt. bilder/SDS) brukes ikke til å trene
              OpenAIs modeller. Risikovurdering skal fortsatt tilpasses egen virksomhet (AML § 3-1 /
              internkontrollforskriften § 5).
            </span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingEnabled ? "Aktiver AI?" : "Slå av AI?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingEnabled
                ? includedInAgreement
                  ? "Aktiver AI – det inngår i avtalen og gir ingen ekstra kostnad. Du får chat-hjelp, tale-til-tekst og valgfrie forslag i avvik, SJA og risikovurdering."
                  : `Aktiver AI – da kommer det ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva ekstra på fakturaen din. Du får chat-hjelp, tale-til-tekst og valgfrie forslag i avvik, SJA og risikovurdering.`
                : includedInAgreement
                  ? "AI slås av med en gang. Inkluderingen i avtalen beholdes, så dere kan slå det på igjen uten ekstra kostnad."
                  : "AI slås av med en gang. Ingen AI-linje på neste faktura. Det gis ikke refusjon for inneværende måned."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={() => {
                void persist(pendingEnabled);
              }}
            >
              {pendingEnabled ? "Aktiver AI" : "Slå av AI"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
