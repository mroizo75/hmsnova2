"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  CheckCircle2,
  FileEdit,
  Send,
  XCircle,
  Archive,
  PenLine,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

type VersionEntry = {
  id: string;
  version: string;
  status: string;
  changeNote: string | null;
  rejectedNote: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  approvedBy: { name: string | null } | null;
  _count: { sections: number; signatures: number };
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  DRAFT: { label: "Utkast", variant: "secondary", icon: FileEdit },
  PENDING_APPROVAL: { label: "Til godkjenning", variant: "default", icon: Send },
  APPROVED: { label: "Godkjent", variant: "default", icon: CheckCircle2 },
  ARCHIVED: { label: "Arkivert", variant: "outline", icon: Archive },
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700";
    case "PENDING_APPROVAL":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700";
    case "APPROVED":
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700";
    case "ARCHIVED":
      return "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700";
    default:
      return "";
  }
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return format(new Date(d), "d. MMM yyyy, HH:mm", { locale: nb });
}

export function HandbokVersionHistory({ versions }: { versions: VersionEntry[] }) {
  if (versions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">Ingen versjonshistorikk</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Det finnes ingen tidligere versjoner av HMS-håndboken ennå.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Versjonshistorikk ({versions.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Endringslogg for alle versjoner av HMS-håndboken.
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {versions.map((v, idx) => {
            const config = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.DRAFT;
            const StatusIcon = config.icon;
            const isLast = idx === versions.length - 1;

            return (
              <div key={v.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-border" />
                )}

                {/* Timeline dot */}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background">
                  <StatusIcon className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">v{v.version}</span>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(v.status)}
                    >
                      {config.label}
                    </Badge>
                  </div>

                  {v.changeNote && (
                    <p className="text-sm text-foreground">{v.changeNote}</p>
                  )}

                  {v.rejectedNote && (
                    <div className="flex items-start gap-1.5 rounded-md bg-red-50 px-3 py-2 dark:bg-red-950/30">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {v.rejectedNote}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Opprettet {formatDate(v.createdAt)}
                    </span>

                    {v.approvedBy?.name && v.approvedAt && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Godkjent av {v.approvedBy.name} – {formatDate(v.approvedAt)}
                      </span>
                    )}

                    {v.publishedAt && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Publisert {formatDate(v.publishedAt)}
                      </span>
                    )}

                    {v._count.signatures > 0 && (
                      <span className="flex items-center gap-1">
                        <PenLine className="h-3 w-3" />
                        {v._count.signatures} signatur{v._count.signatures !== 1 ? "er" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
