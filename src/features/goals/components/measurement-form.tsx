"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { createMeasurement } from "@/server/actions/goal.actions";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp } from "lucide-react";

interface MeasurementFormProps {
  goalId: string;
  goalTitle: string;
  unit?: string | null;
  userId: string;
  trigger?: React.ReactNode;
}

export function MeasurementForm({
  goalId,
  goalTitle,
  unit,
  userId,
  trigger,
}: MeasurementFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      goalId,
      value: parseFloat(formData.get("value") as string),
      measurementDate: formData.get("measurementDate") as string,
      measurementType: formData.get("measurementType") as string,
      comment: formData.get("comment") as string || undefined,
      measuredById: userId,
    };

    const result = await createMeasurement(data);

    if (result.success) {
      toast({
        title: "✅ Måling registrert",
        description: "KPI-verdien er oppdatert",
        className: "bg-green-50 border-green-200",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke registrere måling",
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <TrendingUp className="mr-2 h-4 w-4" />
            Registrer måling
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrer KPI-måling</DialogTitle>
          <DialogDescription>
            ISO 9001 - 9.1: Overvåk og mål fremgang mot målet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 mb-1">
                📊 Mål: {goalTitle}
              </p>
              {unit && (
                <p className="text-sm text-blue-800">
                  Enhet: {unit}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="value">Målt verdi *</Label>
              <Input
                id="value"
                name="value"
                type="number"
                step="0.01"
                placeholder="F.eks. 25.5"
                required
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Verdien som ble målt
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="measurementDate">Målingstidspunkt *</Label>
              <Input
                id="measurementDate"
                name="measurementDate"
                type="date"
                required
                disabled={loading}
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="measurementType">Type måling *</Label>
            <Select name="measurementType" required disabled={loading} defaultValue="MANUAL">
              <SelectTrigger>
                <SelectValue placeholder="Velg type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manuell</SelectItem>
                <SelectItem value="AUTOMATIC">Automatisk</SelectItem>
                <SelectItem value="CALCULATED">Beregnet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Kommentar (valgfritt)</Label>
            <Textarea
              id="comment"
              name="comment"
              rows={3}
              placeholder="Tilleggskommentarer til målingen..."
              disabled={loading}
            />
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                💡 Tips:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Registrer målinger regelmessig for å følge fremgang</li>
                <li>Statusen oppdateres automatisk basert på fremgang</li>
                <li>Legg til kommentar hvis verdien er uventet</li>
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
              {loading ? "Registrerer..." : "Registrer måling"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

