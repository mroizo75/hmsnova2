"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState("");

  const handleApply = async () => {
    const trimmed = participants.trim();
    if (trimmed.length < 3) {
      toast({
        variant: "destructive",
        title: "Deltakere mangler",
        description:
          "Fyll ut hvem som deltar i vurderingen (IK-HMS § 5 nr. 3 og AML § 3-1).",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await applyIndustryRiskTemplate(trimmed);
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
        description: `Risikopunkter for ${industryLabel} er lagt inn, med deltakere dokumentert. Tilpass punktene til egen virksomhet før godkjenning.`,
      });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
              ? `Start med ferdig mal for ${industryLabel}. Dette er et utgangspunkt – dere må tilpasse til egen virksomhet og dokumentere hvem som deltar (IK-HMS § 5 nr. 3 og AML § 3-1).`
              : `Legg inn manglende risikopunkter fra malen for ${industryLabel}. Eksisterende punkter overskrives ikke. Deltakere i vurderingen må dokumenteres.`}
          </p>
          <Button type="button" onClick={() => setOpen(true)} disabled={loading}>
            {`Bruk bransjemal for ${industryLabel}`}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deltakere i vurderingen</DialogTitle>
            <DialogDescription>
              Bransjemalen er et utgangspunkt, ikke en ferdig risikovurdering. Loven krever at
              vurderingen gjøres sammen med arbeidstakerne og verneombudet, og at det dokumenteres
              hvem som deltok (IK-HMS § 5 nr. 3 og AML § 3-1).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="industry-template-participants">
              Deltakere i vurderingen *
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (IK-HMS § 5 nr. 3 + AML § 3-1)
              </span>
            </Label>
            <Textarea
              id="industry-template-participants"
              value={participants}
              onChange={(event) => setParticipants(event.target.value)}
              placeholder="F.eks: Kari Olsen (HMS-ansvarlig), Per Hansen (Verneombud), Anne Berg (Avd.leder)"
              rows={4}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              Skriv navn og rolle på dem som faktisk deltar. Systemet fyller ikke inn deltakere
              automatisk.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="button" onClick={() => void handleApply()} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Henter mal...
                </>
              ) : (
                "Legg inn mal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
