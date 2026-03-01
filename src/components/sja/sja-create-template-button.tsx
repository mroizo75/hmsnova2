"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, BookTemplate } from "lucide-react";
import { createSjaTemplate } from "@/server/actions/sja.actions";

interface HazardRow {
  activity: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  measures: string;
  responsibleName: string;
}

const emptyHazard: HazardRow = {
  activity: "",
  hazard: "",
  consequence: "",
  probability: 1,
  severity: 1,
  measures: "",
  responsibleName: "",
};

interface SjaCreateTemplateButtonProps {
  tenantId: string;
}

export function SjaCreateTemplateButton({ tenantId }: SjaCreateTemplateButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hazards, setHazards] = useState<HazardRow[]>([{ ...emptyHazard }]);

  function addHazard() {
    setHazards([...hazards, { ...emptyHazard }]);
  }

  function removeHazard(index: number) {
    if (hazards.length <= 1) return;
    setHazards(hazards.filter((_, i) => i !== index));
  }

  function updateHazard(index: number, field: keyof HazardRow, value: string | number) {
    const updated = [...hazards];
    (updated[index] as any)[field] = value;
    setHazards(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const validHazards = hazards.filter(
      (h) => h.activity.trim() && h.hazard.trim() && h.measures.trim()
    );

    if (validHazards.length === 0) {
      toast({
        title: "Feil",
        description: "Legg til minst én fare med aktivitet, fare og tiltak.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createSjaTemplate({
        tenantId,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        workLocation: formData.get("workLocation") as string,
        hazards: validHazards,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "SJA-mal opprettet",
        description: "Malen kan nå brukes til å opprette nye SJA-analyser.",
      });

      setOpen(false);
      setHazards([{ ...emptyHazard }]);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke opprette SJA-mal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <BookTemplate className="h-4 w-4 mr-2" />
          Ny SJA-mal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-purple-600" />
            Opprett SJA-mal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-sm">Malnavn *</Label>
              <Input
                name="name"
                placeholder="F.eks: Arbeid i høyden"
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Standard arbeidssted</Label>
              <Input
                name="workLocation"
                placeholder="Valgfritt – bruker kan endre"
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Beskrivelse</Label>
            <Textarea
              name="description"
              placeholder="Beskriv når denne malen skal brukes..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Farer og tiltak</Label>
              <Button type="button" variant="outline" size="sm" onClick={addHazard}>
                <Plus className="h-3 w-3 mr-1" />
                Legg til
              </Button>
            </div>

            {hazards.map((hazard, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Fare #{index + 1}
                  </span>
                  {hazards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHazard(index)}
                      className="h-6 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={hazard.activity}
                    onChange={(e) => updateHazard(index, "activity", e.target.value)}
                    placeholder="Aktivitet *"
                    className="text-sm"
                  />
                  <Input
                    value={hazard.hazard}
                    onChange={(e) => updateHazard(index, "hazard", e.target.value)}
                    placeholder="Fare/risiko *"
                    className="text-sm"
                  />
                </div>

                <Input
                  value={hazard.consequence}
                  onChange={(e) => updateHazard(index, "consequence", e.target.value)}
                  placeholder="Mulig konsekvens"
                  className="text-sm"
                />

                <div className="grid gap-2 md:grid-cols-3">
                  <Select
                    value={String(hazard.probability)}
                    onValueChange={(v) => updateHazard(index, "probability", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Sannsynlighet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 – Svært lav</SelectItem>
                      <SelectItem value="2">2 – Lav</SelectItem>
                      <SelectItem value="3">3 – Middels</SelectItem>
                      <SelectItem value="4">4 – Høy</SelectItem>
                      <SelectItem value="5">5 – Svært høy</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(hazard.severity)}
                    onValueChange={(v) => updateHazard(index, "severity", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Konsekvens" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 – Ubetydelig</SelectItem>
                      <SelectItem value="2">2 – Liten</SelectItem>
                      <SelectItem value="3">3 – Moderat</SelectItem>
                      <SelectItem value="4">4 – Alvorlig</SelectItem>
                      <SelectItem value="5">5 – Svært alvorlig</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    value={hazard.responsibleName}
                    onChange={(e) => updateHazard(index, "responsibleName", e.target.value)}
                    placeholder="Ansvarlig"
                    className="text-sm"
                  />
                </div>

                <Textarea
                  value={hazard.measures}
                  onChange={(e) => updateHazard(index, "measures", e.target.value)}
                  placeholder="Tiltak / barrierer *"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BookTemplate className="h-4 w-4 mr-2" />
              )}
              Opprett mal
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Avbryt
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
