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
import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteIncident } from "@/server/actions/incident.actions";
import {
  getIncidentTypeLabel,
  getIncidentTypeColor,
  getSeverityInfo,
  getIncidentStatusLabel,
  getIncidentStatusColor,
} from "@/features/incidents/schemas/incident.schema";
import { useToast } from "@/hooks/use-toast";
import type { Incident, Measure } from "@prisma/client";

interface IncidentListProps {
  incidents: (Incident & { measures: Measure[] })[];
}

export function IncidentList({ incidents }: IncidentListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette "${title}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteIncident(id);

    if (result.success) {
      toast({
        title: "🗑️ Avvik slettet",
        description: `"${title}" er fjernet`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error || "Kunne ikke slette avvik",
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

  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Ingen avvik registrert</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Avvik</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Alvorlighet</TableHead>
            <TableHead>Dato</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Tiltak</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => {
            const typeLabel = getIncidentTypeLabel(incident.type);
            const typeColor = getIncidentTypeColor(incident.type);
            const { label: severityLabel, bgColor: severityColor, textColor: severityTextColor } = getSeverityInfo(incident.severity);
            const statusLabel = getIncidentStatusLabel(incident.status);
            const statusColor = getIncidentStatusColor(incident.status);
            const completedMeasures = incident.measures.filter(m => m.status === "DONE").length;
            const totalMeasures = incident.measures.length;

            return (
              <TableRow key={incident.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{incident.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {incident.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={typeColor}>{typeLabel}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${severityColor} ${severityTextColor}`}>
                    {incident.severity} - {severityLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDate(incident.occurredAt)}
                </TableCell>
                <TableCell>
                  <Badge className={statusColor}>{statusLabel}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {totalMeasures > 0 ? (
                    <span className="text-sm">
                      {completedMeasures}/{totalMeasures}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/incidents/${incident.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(incident.id, incident.title)}
                      disabled={loading === incident.id}
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

