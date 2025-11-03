"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { updateAudit } from "@/server/actions/audit.actions";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

interface CompleteAuditFormProps {
  auditId: string;
  currentSummary?: string | null;
  currentConclusion?: string | null;
  trigger?: React.ReactNode;
}

export function CompleteAuditForm({
  auditId,
  currentSummary,
  currentConclusion,
  trigger,
}: CompleteAuditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: auditId,
      status: "COMPLETED" as const,
      completedAt: new Date(),
      summary: formData.get("summary") as string,
      conclusion: formData.get("conclusion") as string,
    };

    const result = await updateAudit(data);

    if (result.success) {
      toast({
        title: "✅ Revisjon fullført",
        description: "Revisjonen er markert som fullført med oppsummering og konklusjon",
        className: "bg-green-50 border-green-200",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke fullføre revisjon",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Fullfør revisjon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fullfør revisjon</DialogTitle>
          <DialogDescription>
            ISO 9001: Rapporter resultatene til relevant ledelse
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summary">Oppsummering av revisjon *</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={6}
              placeholder="Oppsummer hva som ble gjennomgått, hvilke områder som ble revidert, og hovedfunn. F.eks. 'Revisjonen dekket HMS-system for produksjonsavdeling. 4 funn ble registrert: 1 større avvik, 1 mindre avvik, 1 observasjon, og 1 styrke.'"
              required
              disabled={loading}
              minLength={50}
              defaultValue={currentSummary || ""}
            />
            <p className="text-sm text-muted-foreground">
              Minimum 50 tegn. Gi en god oversikt over revisjonen.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conclusion">Konklusjon og anbefalinger *</Label>
            <Textarea
              id="conclusion"
              name="conclusion"
              rows={6}
              placeholder="Konkluder om ledelsessystemet er i samsvar med krav, og kom med anbefalinger. F.eks. 'Ledelsessystemet er i hovedsak i samsvar med ISO 9001. Korrigerende tiltak er effektive. Anbefaler å implementere samme løsning i andre avdelinger.'"
              required
              disabled={loading}
              minLength={50}
              defaultValue={currentConclusion || ""}
            />
            <p className="text-sm text-muted-foreground">
              Minimum 50 tegn. ISO 9001: Vurder om systemet er effektivt implementert.
            </p>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                📋 ISO 9001 - 9.2 Rapportering
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Oppsummer omfang og funn fra revisjonen</li>
                <li>Vurder om ledelsessystemet er i samsvar med krav</li>
                <li>Evaluer om systemet er effektivt implementert</li>
                <li>Rapporter resultatene til relevant ledelse</li>
                <li>Anbefal forbedringsområder</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                💡 Tips til oppsummering:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Hvilke områder/avdelinger ble revidert?</li>
                <li>Hvilke ISO 9001 klausuler ble dekket?</li>
                <li>Antall funn (større/mindre avvik, observasjoner, styrker)</li>
                <li>Generelt inntrykk av HMS-kulturen</li>
                <li>Positive observasjoner og forbedringsområder</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Fullfører..." : "Fullfør revisjon"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

