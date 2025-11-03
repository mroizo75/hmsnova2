"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Trash2, Clock } from "lucide-react";
import { completeMeasure, deleteMeasure } from "@/server/actions/measure.actions";
import { getMeasureStatusLabel, getMeasureStatusColor } from "@/features/measures/schemas/measure.schema";
import { useToast } from "@/hooks/use-toast";
import type { Measure } from "@prisma/client";

interface MeasureListProps {
  measures: (Measure & {
    risk?: { id: string; title: string } | null;
  })[];
}

export function MeasureList({ measures }: MeasureListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleComplete = async (id: string, title: string) => {
    if (!confirm(`Marker "${title}" som fullført?\n\nDette vil oppdatere status til FULLFØRT.`)) {
      return;
    }

    setLoading(id);
    const result = await completeMeasure({
      id,
      completedAt: new Date().toISOString(),
    });

    if (result.success) {
      toast({
        title: "✅ Tiltak fullført",
        description: `"${title}" er nå markert som fullført`,
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke fullføre tiltak",
      });
    }
    setLoading(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette "${title}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteMeasure(id);

    if (result.success) {
      toast({
        title: "🗑️ Tiltak slettet",
        description: `"${title}" er fjernet`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke slette tiltak",
      });
    }
    setLoading(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("no-NO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isOverdue = (dueAt: Date, status: string) => {
    if (status === "DONE") return false;
    return new Date() > new Date(dueAt);
  };

  if (measures.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Ingen tiltak registrert</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiltak</TableHead>
            <TableHead>Knyttet til</TableHead>
            <TableHead>Frist</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {measures.map((measure) => {
            const statusLabel = getMeasureStatusLabel(measure.status);
            const statusColor = getMeasureStatusColor(measure.status);
            const overdue = isOverdue(measure.dueAt, measure.status);

            return (
              <TableRow key={measure.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{measure.title}</div>
                    {measure.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {measure.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {measure.risk && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Risiko:</span>{" "}
                      {measure.risk.title}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {overdue && <Clock className="h-4 w-4 text-red-600" />}
                    <span className={overdue ? "text-red-600 font-semibold" : ""}>
                      {formatDate(measure.dueAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColor}>{statusLabel}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {measure.status !== "DONE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComplete(measure.id, measure.title)}
                        disabled={loading === measure.id}
                        title="Marker som fullført"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(measure.id, measure.title)}
                      disabled={loading === measure.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

