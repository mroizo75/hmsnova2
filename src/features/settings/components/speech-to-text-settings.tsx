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
import { updateSpeechToTextSettings } from "@/server/actions/settings.actions";
import { Mic } from "lucide-react";

interface SpeechToTextSettingsProps {
  initialEnabled: boolean;
  isAdmin: boolean;
}

export function SpeechToTextSettings({ initialEnabled, isAdmin }: SpeechToTextSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setLoading(true);
    const result = await updateSpeechToTextSettings(next);
    setLoading(false);

    if (result.success) {
      toast({
        title: next ? "Tale-til-tekst er slått på" : "Tale-til-tekst er slått av",
        description: next
          ? "Ansatte kan snakke inn tekst. Standard er norsk. Andre språk oversettes til norsk eller engelsk."
          : "Mikrofonknappen vises ikke lenger i appen.",
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
          <Mic className="h-5 w-5" />
          Tale-til-tekst
        </CardTitle>
        <CardDescription>
          La ansatte fylle ut skjemaer ved å snakke. Standard er norsk tale. Andre språk kan brukes, og teksten skrives inn automatisk på norsk eller engelsk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor="speech-enabled" className="text-base">
              Aktiver tale-til-tekst i appen
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "Mikrofon vises på tekstfelt i mobilappen."
                : "Tale-til-tekst er av for denne virksomheten."}
            </p>
          </div>
          <Switch
            id="speech-enabled"
            checked={enabled}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
