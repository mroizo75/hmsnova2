"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Pencil, Trash2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { deleteMeasure } from "@/server/actions/measure.actions";
import { getMeasureStatusLabel, getMeasureStatusColor } from "@/features/measures/schemas/measure.schema";
import { useToast } from "@/hooks/use-toast";
import type { ActionEffectiveness, Measure } from "@prisma/client";

interface MeasureWithSources extends Measure {
  risk?: { id: string; title: string } | null;
  incident?: { id: string; title: string; avviksnummer?: string | null } | null;
  audit?: { id: string; title: string } | null;
  goal?: { id: string; title: string } | null;
  inspectionFindings?: { id: string; title: string; inspection: { id: string; title: string } }[];
  decisionMeasures?: { id: string; title: string; meeting: { id: string; title: string } }[];
}

interface MeasureListProps {
  measures: MeasureWithSources[];
  showSourceBadges?: boolean;
}

export function MeasureList({ measures, showSourceBadges }: MeasureListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

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
    <>
      <div className="hidden rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tiltak</TableHead>
            <TableHead className="hidden md:table-cell">Detaljer</TableHead>
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
            const categoryLabels: Record<string, string> = {
              CORRECTIVE: "Korrigerende",
              PREVENTIVE: "Forebyggende",
              IMPROVEMENT: "Forbedring",
              MITIGATION: "Mitigering",
            };
            const frequencyLabels: Record<string, string> = {
              WEEKLY: "Ukentlig",
              MONTHLY: "Månedlig",
              QUARTERLY: "Kvartalsvis",
              ANNUAL: "Årlig",
              BIENNIAL: "Annet hvert år",
            };
            const effectivenessLabels: Record<ActionEffectiveness, string> = {
              EFFECTIVE: "Effektivt",
              PARTIALLY_EFFECTIVE: "Delvis",
              INEFFECTIVE: "Ikke effekt",
              NOT_EVALUATED: "Ikke evaluert",
            };

            return (
              <TableRow key={measure.id}>
                <TableCell>
                  <div>
                    <Link
                      href={`/dashboard/measures/${measure.id}`}
                      className="font-medium hover:underline"
                    >
                      {measure.title}
                    </Link>
                    {measure.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {measure.description}
                      </p>
                    )}
                    {showSourceBadges && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {measure.risk && (
                          <Link href={`/dashboard/risks/${measure.risk.id}`}>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 text-xs">
                              Risiko: {measure.risk.title}
                            </Badge>
                          </Link>
                        )}
                        {measure.incident && (
                          <Link href={`/dashboard/incidents/${measure.incident.id}`}>
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 text-xs">
                              Avvik {measure.incident.avviksnummer || measure.incident.title}
                            </Badge>
                          </Link>
                        )}
                        {measure.audit && (
                          <Link href={`/dashboard/audits/${measure.audit.id}`}>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 text-xs">
                              Revisjon: {measure.audit.title}
                            </Badge>
                          </Link>
                        )}
                        {measure.goal && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            Mål: {measure.goal.title}
                          </Badge>
                        )}
                        {measure.inspectionFindings?.map((f) => (
                          <Link key={f.id} href={`/dashboard/inspections/${f.inspection.id}`}>
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 text-xs">
                              Inspeksjon: {f.inspection.title}
                            </Badge>
                          </Link>
                        ))}
                        {measure.decisionMeasures?.map((d) => (
                          <Link key={d.id} href={`/dashboard/meetings/${d.meeting.id}`}>
                            <Badge className="bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 text-xs">
                              AMU: {d.meeting.title}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      {categoryLabels[measure.category] || measure.category}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Oppfølging:</span>{" "}
                      {frequencyLabels[measure.followUpFrequency || "ANNUAL"]}
                    </div>
                    {measure.costEstimate && (
                      <div>
                        <span className="text-muted-foreground">Kost:</span>{" "}
                        {measure.costEstimate.toLocaleString("no-NO")} kr
                      </div>
                    )}
                    {measure.benefitEstimate && (
                      <div>
                        <span className="text-muted-foreground">Effekt:</span>{" "}
                        {measure.benefitEstimate}
                      </div>
                    )}
                    {measure.effectiveness !== "NOT_EVALUATED" && (
                      <div>
                        <span className="text-muted-foreground">Evaluering:</span>{" "}
                        {effectivenessLabels[measure.effectiveness]}
                      </div>
                    )}
                    {measure.risk && (
                      <div>
                        <span className="text-muted-foreground">Risiko:</span>{" "}
                        {measure.risk.title}
                      </div>
                    )}
                  </div>
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
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/dashboard/measures/${measure.id}`}
                        title="Rediger og oppdater status"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
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

      <div className="space-y-3 md:hidden">
        {measures.map((measure) => {
          const statusLabel = getMeasureStatusLabel(measure.status);
          const statusColor = getMeasureStatusColor(measure.status);
          const overdue = isOverdue(measure.dueAt, measure.status);

          return (
            <Card key={measure.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/measures/${measure.id}`} className="font-medium hover:underline">
                      {measure.title}
                    </Link>
                    {measure.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{measure.description}</p>
                    ) : null}
                    {showSourceBadges && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {measure.risk && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Risiko</Badge>
                        )}
                        {measure.incident && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">Avvik</Badge>
                        )}
                        {measure.audit && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Revisjon</Badge>
                        )}
                        {measure.goal && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Mål</Badge>
                        )}
                        {(measure.inspectionFindings?.length ?? 0) > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Inspeksjon</Badge>
                        )}
                        {(measure.decisionMeasures?.length ?? 0) > 0 && (
                          <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs">AMU</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge className={statusColor}>{statusLabel}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {overdue ? <Clock className="h-4 w-4 text-red-600" /> : null}
                  <span className={overdue ? "font-semibold text-red-600" : ""}>
                    Frist: {formatDate(measure.dueAt)}
                  </span>
                </div>
                <div className="flex gap-2 border-t pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/measures/${measure.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Åpne
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(measure.id, measure.title)}
                    disabled={loading === measure.id}
                    aria-label="Slett tiltak"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

