"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { investigateIncident } from "@/server/actions/incident.actions";
import { useToast } from "@/hooks/use-toast";
import { FileSearch } from "lucide-react";

interface InvestigationFormProps {
  incidentId: string;
  users: Array<{ id: string; name: string | null; email: string }>;
}

export function InvestigationForm({ incidentId, users }: InvestigationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: incidentId,
      rootCause: formData.get("rootCause") as string,
      contributingFactors: formData.get("contributingFactors") as string || undefined,
      investigatedBy: formData.get("investigatedBy") as string,
    };

    try {
      const result = await investigateIncident(data);

      if (result.success) {
        toast({
          title: "✅ Årsaksanalyse fullført",
          description: "Nå kan du planlegge korrigerende tiltak",
          className: "bg-green-50 border-green-200",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lagre årsaksanalyse",
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
          <FileSearch className="h-5 w-5" />
          Årsaksanalyse (Root Cause Analysis)
        </CardTitle>
        <CardDescription>
          ISO 9001: Vurder behov for tiltak for å eliminere årsaken
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 mb-4">
            <p className="text-sm font-medium text-yellow-900 mb-2">🔍 5 Hvorfor-metoden</p>
            <p className="text-sm text-yellow-800">
              Spør "hvorfor" gjentatte ganger for å finne grunnårsaken. F.eks:
            </p>
            <ul className="text-xs text-yellow-700 mt-2 space-y-1 list-disc list-inside ml-2">
              <li>Hvorfor skjedde ulykken? → Personen falt fra stige</li>
              <li>Hvorfor falt personen? → Stigen sto ustabilt</li>
              <li>Hvorfor sto stigen ustabilt? → Gulvet var glatt/ujevnt</li>
              <li>Hvorfor var gulvet glatt? → Ingen risikovurdering utført</li>
              <li><strong>Grunnårsak: Mangelfull planlegging og risikovurdering</strong></li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rootCause">Grunnårsak (Root Cause) *</Label>
            <Textarea
              id="rootCause"
              name="rootCause"
              placeholder="Hva er den underliggende årsaken til at dette skjedde? Bruk 5 Hvorfor-metoden."
              required
              disabled={loading}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Beskriv grunnårsaken, ikke bare symptomet
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contributingFactors">Medvirkende faktorer</Label>
            <Textarea
              id="contributingFactors"
              name="contributingFactors"
              placeholder="Andre faktorer som bidro til hendelsen (f.eks. tidpress, manglende opplæring, dårlig kommunikasjon)"
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investigatedBy">Utredet av *</Label>
            <Select name="investigatedBy" required disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Velg ansvarlig for utredning" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Lagrer..." : "Fullfør årsaksanalyse"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

