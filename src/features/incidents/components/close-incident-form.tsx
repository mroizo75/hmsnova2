"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { closeIncident } from "@/server/actions/incident.actions";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

interface CloseIncidentFormProps {
  incidentId: string;
  userId: string;
}

export function CloseIncidentForm({ incidentId, userId }: CloseIncidentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: incidentId,
      closedBy: userId,
      effectivenessReview: formData.get("effectivenessReview") as string,
      lessonsLearned: formData.get("lessonsLearned") as string || undefined,
    };

    try {
      const result = await closeIncident(data);

      if (result.success) {
        toast({
          title: "✅ Avvik lukket",
          description: "Avviket er nå fullstendig håndtert og dokumentert",
          className: "bg-green-50 border-green-200",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lukke avvik",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Lukk avvik
        </CardTitle>
        <CardDescription>
          ISO 9001: Gjennomgå effektiviteten av korrigerende tiltak
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
            <p className="text-sm font-medium text-green-900 mb-2">✅ Klart for lukking</p>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>Årsaksanalyse er fullført</li>
              <li>Alle korrigerende tiltak er gjennomført</li>
              <li>Nå må du evaluere om tiltakene var effektive</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectivenessReview">Effektivitetsvurdering *</Label>
            <Textarea
              id="effectivenessReview"
              name="effectivenessReview"
              placeholder="Har tiltakene eliminert grunnårsaken? Vil lignende hendelser kunne forebygges nå? Beskriv evalueringen."
              required
              disabled={loading}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Vurder om de korrigerende tiltakene har vært effektive
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsLearned">Læringspunkter</Label>
            <Textarea
              id="lessonsLearned"
              name="lessonsLearned"
              placeholder="Hva har vi lært av denne hendelsen? Hva kan vi forbedre i fremtiden?"
              disabled={loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Dokumenter læring for fremtidig forbedring
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">📋 ISO 9001 Compliance</p>
            <p className="text-sm text-blue-800">
              Ved å lukke avviket bekrefter du at:
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside ml-2">
              <li>Grunnårsaken er identifisert og dokumentert</li>
              <li>Korrigerende tiltak er implementert</li>
              <li>Effektiviteten av tiltakene er vurdert</li>
              <li>Dokumentasjonen er komplett og bevares</li>
            </ul>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Lukker..." : "Lukk avvik"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

