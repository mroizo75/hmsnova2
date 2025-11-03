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
import { evaluateTraining } from "@/server/actions/training.actions";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck } from "lucide-react";

interface TrainingEvaluationFormProps {
  trainingId: string;
  trainingTitle: string;
  userId: string;
  trigger?: React.ReactNode;
}

export function TrainingEvaluationForm({
  trainingId,
  trainingTitle,
  userId,
  trigger,
}: TrainingEvaluationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const effectiveness = formData.get("effectiveness") as string;

    const result = await evaluateTraining({
      id: trainingId,
      effectiveness,
      evaluatedBy: userId,
    });

    if (result.success) {
      toast({
        title: "✅ Evaluering registrert",
        description: "Effektivitetsvurderingen er dokumentert",
        className: "bg-green-50 border-green-200",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke registrere evaluering",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Evaluer effektivitet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Evaluer effektivitet av opplæring</DialogTitle>
          <DialogDescription>
            ISO 9001 - 7.2: Evaluer om opplæringen har gitt ønsket kompetanse og effekt
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                📚 Kurs: {trainingTitle}
              </p>
              <p className="text-sm text-blue-800">
                Vurder om opplæringen har hatt ønsket effekt. Har den ansatte tilegnet seg
                nødvendig kompetanse? Brukes kunnskapen i praksis?
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="effectiveness">Effektivitetsvurdering *</Label>
            <Textarea
              id="effectiveness"
              name="effectiveness"
              rows={6}
              placeholder="Beskriv hvordan opplæringen har påvirket den ansattes kompetanse og arbeidsprestasjon. Eksempel: 'Den ansatte viser god forståelse for HMS-prosedyrer og anvender kunnskapen aktivt i det daglige arbeidet. Opplæringen vurderes som effektiv.'"
              required
              disabled={loading}
              minLength={20}
            />
            <p className="text-sm text-muted-foreground">
              Minimum 20 tegn. Vær konkret og beskrivende.
            </p>
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                💡 Veiledning for evaluering:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Har den ansatte demonstrert økt kompetanse?</li>
                <li>Brukes kunnskapen i praktisk arbeid?</li>
                <li>Har opplæringen bidratt til færre avvik/hendelser?</li>
                <li>Er det behov for ytterligere opplæring?</li>
                <li>Anbefales kurset til andre ansatte?</li>
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
              {loading ? "Lagrer..." : "Registrer evaluering"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

