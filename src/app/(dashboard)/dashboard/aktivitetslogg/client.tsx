"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Search } from "lucide-react";

type AuditLogEntry = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string | null;
  metadata: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  ROUTINE_CREATED: "Rutine opprettet",
  ROUTINE_UPDATED: "Rutine oppdatert",
  ROUTINE_DELETED: "Rutine slettet",
  ROUTINE_PUBLISHED: "Rutine publisert",
  DOCUMENT_CREATED: "Dokument opprettet",
  DOCUMENT_UPLOADED: "Dokument lastet opp",
  DOCUMENT_APPROVED: "Dokument godkjent",
  DOCUMENT_DELETED: "Dokument slettet",
  DOCUMENT_VERSION_UPLOADED: "Ny dokumentversjon",
  DOCUMENT_UPDATED: "Dokument oppdatert",
  HANDBOOK_VERSION_CREATED: "Håndbok-versjon opprettet",
  HANDBOOK_VERSION_APPROVED: "Håndbok godkjent",
  HANDBOOK_VERSION_REJECTED: "Håndbok avvist",
  HANDBOOK_SIGNED: "Håndbok signert",
  INCIDENT_CREATED: "Hendelse registrert",
  INCIDENT_UPDATED: "Hendelse oppdatert",
  INCIDENT_CLOSED: "Hendelse lukket",
  RISK_CREATED: "Risikovurdering opprettet",
  RISK_UPDATED: "Risikovurdering oppdatert",
  RISK_DELETED: "Risikovurdering slettet",
  SJA_CREATED: "SJA opprettet",
  SJA_UPDATED: "SJA oppdatert",
  SJA_COMPLETED: "SJA fullført",
  INSPECTION_CREATED: "Vernerunde opprettet",
  INSPECTION_COMPLETED: "Vernerunde fullført",
  TRAINING_CREATED: "Opplæring opprettet",
  TRAINING_COMPLETED: "Opplæring fullført",
  AUDIT_CREATED: "Revisjon opprettet",
  AUDIT_COMPLETED: "Revisjon fullført",
  USER_INVITED: "Bruker invitert",
  USER_ROLE_CHANGED: "Brukerrolle endret",
  SETTINGS_UPDATED: "Innstillinger oppdatert",
  CHEMICAL_CREATED: "Kjemikalie opprettet",
  CHEMICAL_UPDATED: "Kjemikalie oppdatert",
  GOAL_CREATED: "Mål opprettet",
  GOAL_UPDATED: "Mål oppdatert",
};

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function parseDetails(metadata: string | null): string {
  if (!metadata) return "–";
  try {
    const parsed = JSON.parse(metadata);
    if (typeof parsed === "object" && parsed !== null) {
      const entries = Object.entries(parsed)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .slice(0, 3);
      if (entries.length === 0) return "–";
      return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
    }
    return String(parsed);
  } catch {
    return metadata.length > 80 ? metadata.slice(0, 80) + "…" : metadata;
  }
}

export function AktivitetsloggClient({
  logs,
  actions,
}: {
  logs: AuditLogEntry[];
  actions: string[];
}) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = logs;

    if (actionFilter !== "all") {
      result = result.filter((l) => l.action === actionFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.resource?.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          getActionLabel(l.action).toLowerCase().includes(q),
      );
    }

    return result;
  }, [logs, actionFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk etter ressurs, bruker eller handling…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Filtrer på handling" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle handlinger</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {getActionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Tidspunkt</TableHead>
                <TableHead className="w-[160px]">Bruker</TableHead>
                <TableHead className="w-[200px]">Handling</TableHead>
                <TableHead className="w-[200px]">Ressurs</TableHead>
                <TableHead>Detaljer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Ingen oppføringer funnet
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "d. MMM yyyy, HH:mm", {
                        locale: nb,
                      })}
                    </TableCell>
                    <TableCell className="text-sm">{log.userName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {getActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.resource ?? "–"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                      {parseDetails(log.metadata)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Viser {filtered.length} av {logs.length} oppføringer
      </p>
    </div>
  );
}
