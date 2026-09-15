"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Clock, CheckCircle, FileText } from "lucide-react";
import {
  MOC_STATUS_LABELS,
  MOC_CLASSIFICATION_LABELS,
  MOC_TYPE_LABELS,
} from "@/lib/moc-labels";
import type { fetchMocList } from "@/server/queries/moc.queries";

type MocListData = Awaited<ReturnType<typeof fetchMocList>>;

export function MocListContent({
  data,
  detailBasePath = "/dashboard/moc",
}: {
  data: MocListData;
  detailBasePath?: string;
}) {
  const items = data.items ?? [];
  const stats = {
    total: items.length,
    open: items.filter((item) => !["CLOSED", "REJECTED", "CANCELLED"].includes(item.status)).length,
    pending: items.filter((item) => item.status === "PENDING_APPROVAL").length,
    closed: items.filter((item) => item.status === "CLOSED").length,
  };

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Åpne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" /> Til godkjenning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Lukket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Saker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Ingen endringssaker ennå.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`${detailBasePath}/${item.id}`}
                    className="block rounded-lg border p-4 hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.number}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{MOC_STATUS_LABELS[item.status]}</Badge>
                        <Badge variant="secondary">{MOC_CLASSIFICATION_LABELS[item.classification]}</Badge>
                        <Badge variant="secondary">{MOC_TYPE_LABELS[item.changeType]}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Foreslått av {item.proposedBy.name ?? "ukjent"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
