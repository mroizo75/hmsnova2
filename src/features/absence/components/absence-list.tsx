"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { AbsenceType, AbsenceStatus } from "@prisma/client";
import { approveAbsence, rejectAbsence } from "@/server/actions/absence.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AbsenceStatusBadge } from "./absence-status-badge";
import { AbsenceTypeBadge } from "./absence-type-badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2 } from "lucide-react";

type AbsenceListItem = {
  id: string;
  type: AbsenceType;
  status: AbsenceStatus;
  startDate: Date;
  endDate: Date;
  workdays: number;
  percentage: number;
  employee: { id: string; name: string | null; email: string };
};

interface AbsenceListProps {
  absences: AbsenceListItem[];
  canApprove: boolean;
}

const STATUS_LABELS: Record<AbsenceStatus | "ALL", string> = {
  ALL: "Alle statuser",
  PENDING: "Venter",
  APPROVED: "Godkjent",
  REJECTED: "Avvist",
  CANCELLED: "Kansellert",
};

const TYPE_LABELS: Record<AbsenceType | "ALL", string> = {
  ALL: "Alle typer",
  SELF_CERTIFIED: "Egenmelding",
  SICK_LEAVE: "Sykemelding",
  PARENTAL_LEAVE: "Foreldrepermisjon",
  VACATION: "Ferie",
  LEAVE_OF_ABSENCE: "Permisjon",
  COMPENSATORY: "Avspasering",
  CARE_DAYS: "Omsorgsdager",
  MILITARY: "Militærtjeneste",
  BEREAVEMENT: "Velferdspermisjon",
  OTHER: "Annet",
};

export function AbsenceList({ absences, canApprove }: AbsenceListProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AbsenceStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<AbsenceType | "ALL">("ALL");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = absences
    .filter((a) => {
      const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
      const matchType = typeFilter === "ALL" || a.type === typeFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        a.employee.name?.toLowerCase().includes(q) ||
        a.employee.email.toLowerCase().includes(q);
      return matchStatus && matchType && matchSearch;
    })
    .sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

  function handleApprove(id: string) {
    setPendingAction(id);
    startTransition(async () => {
      const result = await approveAbsence({ id });
      setPendingAction(null);
      if (result.success) {
        toast({ title: "Fravær godkjent" });
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleReject(id: string) {
    setPendingAction(id);
    startTransition(async () => {
      const result = await rejectAbsence({ id });
      setPendingAction(null);
      if (result.success) {
        toast({ title: "Fravær avvist" });
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input
          placeholder="Søk på ansatt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as AbsenceStatus | "ALL")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as (AbsenceStatus | "ALL")[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_LABELS[key]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as AbsenceType | "ALL")}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as (AbsenceType | "ALL")[]).map(
              (key) => (
                <SelectItem key={key} value={key}>
                  {TYPE_LABELS[key]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {absences.length === 0
              ? "Ingen fravær registrert ennå."
              : "Ingen fravær matcher filteret."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ansatt</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Dager</TableHead>
                <TableHead>Status</TableHead>
                {canApprove && <TableHead className="text-right">Handlinger</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((absence) => (
                <TableRow key={absence.id}>
                  <TableCell className="font-medium">
                    {absence.employee.name ?? absence.employee.email}
                  </TableCell>
                  <TableCell>
                    <AbsenceTypeBadge type={absence.type} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(absence.startDate), "d. MMM yyyy", {
                      locale: nb,
                    })}{" "}
                    –{" "}
                    {format(new Date(absence.endDate), "d. MMM yyyy", {
                      locale: nb,
                    })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {absence.workdays}
                    {absence.percentage < 100 && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({absence.percentage}%)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AbsenceStatusBadge status={absence.status} />
                  </TableCell>
                  {canApprove && (
                    <TableCell className="text-right">
                      {absence.status === "PENDING" && (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                            disabled={isPending && pendingAction === absence.id}
                            onClick={() => handleApprove(absence.id)}
                          >
                            {isPending && pendingAction === absence.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            disabled={isPending && pendingAction === absence.id}
                            onClick={() => handleReject(absence.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
