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
import { updateSjaApprovalRequired } from "@/server/actions/settings.actions";
import { HardHat, Info } from "lucide-react";

interface SjaApprovalSettingsProps {
  initialRequired: boolean;
  isAdmin: boolean;
}

export function SjaApprovalSettings({ initialRequired, isAdmin }: SjaApprovalSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [required, setRequired] = useState(initialRequired);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (next: boolean) => {
    setRequired(next);
    setLoading(true);
    const result = await updateSjaApprovalRequired(next);
    setLoading(false);

    if (result.success) {
      toast({
        title: next ? "SJA må godkjennes" : "SJA trenger ikke godkjenning",
        description: next
          ? "Innsendte SJA-er venter til leder, HMS eller admin godkjenner."
          : "Innsendte SJA-er er klare til bruk. Leder, HMS og admin får likevel beskjed.",
      });
      router.refresh();
    } else {
      setRequired(!next);
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
          <HardHat className="h-5 w-5" />
          Skal SJA godkjennes?
        </CardTitle>
        <CardDescription>
          Risikovurderingen skal gjøres før arbeidet. Om en annen person skal godkjenne hver SJA,
          er et valg virksomheten tar selv.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor="sja-approval-required" className="text-base">
              Krev godkjenning
            </Label>
            <p className="text-sm text-muted-foreground">
              {required
                ? "SJA blir stående til leder, HMS eller admin godkjenner. De får e-post."
                : "Innsendt SJA kan brukes med en gang. Leder, HMS og admin får e-post om at den er sendt."}
            </p>
          </div>
          <Switch
            id="sja-approval-required"
            checked={required}
            disabled={loading}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 flex gap-2 text-sm text-blue-900 dark:text-blue-100">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Arbeidsmiljøloven § 3-1 og internkontrollforskriften § 5 nr. 6 krever at farer kartlegges
            og risiko vurderes. De krever ikke at en annen person godkjenner hver SJA. Slå på
            godkjenning bare hvis det står i egen rutine.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
