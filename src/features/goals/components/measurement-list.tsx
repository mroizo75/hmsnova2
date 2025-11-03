"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, TrendingUp } from "lucide-react";
import { deleteMeasurement } from "@/server/actions/goal.actions";
import { useToast } from "@/hooks/use-toast";
import {
  getMeasurementTypeLabel,
  getMeasurementTypeColor,
} from "@/features/goals/schemas/goal.schema";
import type { KpiMeasurement } from "@prisma/client";

interface MeasurementListProps {
  measurements: KpiMeasurement[];
  unit?: string | null;
}

export function MeasurementList({ measurements, unit }: MeasurementListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne målingen?\n\nDette kan ikke angres.")) {
      return;
    }

    setLoading(id);
    const result = await deleteMeasurement(id);
    if (result.success) {
      toast({
        title: "🗑️ Måling slettet",
        description: "Målingen er fjernet",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: result.error || "Kunne ikke slette måling",
      });
    }
    setLoading(null);
  };

  if (measurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Ingen målinger registrert</h3>
        <p className="text-muted-foreground">
          Start med å registrere din første KPI-måling.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {measurements.map((measurement) => {
        const typeLabel = getMeasurementTypeLabel(measurement.measurementType);
        const typeColor = getMeasurementTypeColor(measurement.measurementType);

        return (
          <Card key={measurement.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {measurement.value.toFixed(2)} {unit || ""}
                    </span>
                    <Badge className={typeColor}>{typeLabel}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {new Date(measurement.measurementDate).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  {measurement.comment && (
                    <p className="text-sm">{measurement.comment}</p>
                  )}

                  {measurement.source && (
                    <p className="text-xs text-muted-foreground">
                      Kilde: {measurement.source}
                    </p>
                  )}
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(measurement.id)}
                  disabled={loading === measurement.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

