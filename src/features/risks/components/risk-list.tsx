"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Edit, Trash2, CheckCircle } from "lucide-react";
import Link from "next/link";
import { deleteRisk } from "@/server/actions/risk.actions";
import { calculateRiskScore } from "@/features/risks/schemas/risk.schema";
import { useToast } from "@/hooks/use-toast";
import type { Risk, Measure } from "@prisma/client";

interface RiskListProps {
  risks: (Risk & { measures: Measure[] })[];
}

const statusLabels: Record<string, string> = {
  OPEN: "Åpen",
  MITIGATING: "Under håndtering",
  ACCEPTED: "Akseptert",
  CLOSED: "Lukket",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  OPEN: "destructive",
  MITIGATING: "default",
  ACCEPTED: "secondary",
  CLOSED: "secondary",
};

export function RiskList({ risks }: RiskListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette "${title}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteRisk(id);
    
    if (result.success) {
      toast({
        title: "🗑️ Risiko slettet",
        description: `"${title}" er fjernet`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: result.error || "Kunne ikke slette risiko",
      });
    }
    setLoading(null);
  };

  if (risks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">Ingen risikoer</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Opprett din første risikovurdering for å komme i gang
        </p>
        <Button asChild>
          <Link href="/dashboard/risks/new">Opprett risikovurdering</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop - Tabell */}
      <div className="hidden md:block rounded-lg border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Risiko</TableHead>
            <TableHead className="text-center">S</TableHead>
            <TableHead className="text-center">K</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead>Nivå</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Tiltak</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {risks.map((risk) => {
            const { level, bgColor, textColor } = calculateRiskScore(risk.likelihood, risk.consequence);
            const completedMeasures = risk.measures.filter(m => m.status === "DONE").length;
            const totalMeasures = risk.measures.length;

            return (
              <TableRow key={risk.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{risk.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {risk.context}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {risk.likelihood}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {risk.consequence}
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold">
                    {risk.score}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${bgColor} ${textColor}`}>{level}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[risk.status]}>
                    {statusLabels[risk.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {totalMeasures > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {completedMeasures}/{totalMeasures}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/risks/${risk.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(risk.id, risk.title)}
                      disabled={loading === risk.id}
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

      {/* Mobile - Kort */}
      <div className="md:hidden space-y-3">
        {risks.map((risk) => {
          const { level, bgColor, textColor } = calculateRiskScore(risk.likelihood, risk.consequence);
          const completedMeasures = risk.measures.filter(m => m.status === "DONE").length;
          const totalMeasures = risk.measures.length;

          return (
            <Card key={risk.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-1">{risk.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {risk.context}
                      </p>
                    </div>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold shrink-0">
                      {risk.score}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge className={`${bgColor} ${textColor}`}>{level}</Badge>
                    <Badge variant={statusVariants[risk.status]}>
                      {statusLabels[risk.status]}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      S:{risk.likelihood} · K:{risk.consequence}
                    </div>
                  </div>

                  {totalMeasures > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>
                        Tiltak: {completedMeasures}/{totalMeasures} fullført
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/dashboard/risks/${risk.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Rediger
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(risk.id, risk.title)}
                      disabled={loading === risk.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

