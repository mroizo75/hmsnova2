"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, FileDown, ArrowRight } from "lucide-react";

interface RoutineVersion {
  id: string;
  versionNumber: number;
  changeNumber: string;
  changeSummary: string;
  changeReason: string | null;
  content: Record<string, unknown>;
  legalReference: string | null;
  changedBy: { name: string | null; email: string };
  createdAt: string;
}

interface RoutineChangelogProps {
  routineId: string;
  routineTitle: string;
  versions: RoutineVersion[];
}

function computeJsonDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): Array<{ key: string; type: "added" | "removed" | "changed"; oldValue?: string; newValue?: string }> {
  const changes: Array<{
    key: string;
    type: "added" | "removed" | "changed";
    oldValue?: string;
    newValue?: string;
  }> = [];

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldVal = JSON.stringify(oldObj[key] ?? null);
    const newVal = JSON.stringify(newObj[key] ?? null);

    if (!(key in oldObj)) {
      changes.push({ key, type: "added", newValue: newVal });
    } else if (!(key in newObj)) {
      changes.push({ key, type: "removed", oldValue: oldVal });
    } else if (oldVal !== newVal) {
      changes.push({ key, type: "changed", oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}

export function RoutineChangelog({
  routineId,
  routineTitle,
  versions,
}: RoutineChangelogProps) {
  const [compareFrom, setCompareFrom] = useState<string>("");
  const [compareTo, setCompareTo] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const fromVersion = versions.find((v) => v.id === compareFrom);
  const toVersion = versions.find((v) => v.id === compareTo);

  const diff =
    fromVersion && toVersion
      ? computeJsonDiff(
          fromVersion.content as Record<string, unknown>,
          toVersion.content as Record<string, unknown>,
        )
      : null;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const printContent = document.getElementById("changelog-content");
      if (printContent) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Endringshistorikk - ${routineTitle}</title>
                <style>
                  body { font-family: system-ui, sans-serif; padding: 2rem; }
                  h1 { font-size: 1.5rem; margin-bottom: 1rem; }
                  .version { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
                  .version-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
                  .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; background: #f1f5f9; }
                  .meta { font-size: 0.875rem; color: #666; }
                  @media print { body { padding: 1rem; } }
                </style>
              </head>
              <body>
                <h1>Endringshistorikk: ${routineTitle}</h1>
                <p class="meta">Eksportert: ${new Date().toLocaleDateString("nb-NO")}</p>
                <p class="meta">IK-HMS § 5 nr. 7-8: Dokumentasjon av endringer</p>
                <hr />
                ${versions
                  .map(
                    (v) => `
                  <div class="version">
                    <div class="version-header">
                      <div>
                        <span class="badge">${v.changeNumber}</span>
                        <strong> Versjon ${v.versionNumber}</strong>
                      </div>
                      <span class="meta">${new Date(v.createdAt).toLocaleDateString("nb-NO")}</span>
                    </div>
                    <p>${v.changeSummary}</p>
                    ${v.changeReason ? `<p class="meta">Begrunnelse: ${v.changeReason}</p>` : ""}
                    ${v.legalReference ? `<p class="meta">Lovforankring: ${v.legalReference}</p>` : ""}
                    <p class="meta">Av: ${v.changedBy.name || v.changedBy.email}</p>
                  </div>
                `,
                  )
                  .join("")}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Endringshistorikk
            </CardTitle>
            <CardDescription>
              Versjonslogg med endringsnummer (IK-HMS § 5 nr. 7)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting || versions.length === 0}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Eksporter PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Diff-sammenligning */}
        {versions.length >= 2 && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">Sammenlign versjoner</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={compareFrom} onValueChange={setCompareFrom}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Fra versjon..." />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      V{v.versionNumber} ({v.changeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Select value={compareTo} onValueChange={setCompareTo}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Til versjon..." />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      V{v.versionNumber} ({v.changeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {diff && (
              <div className="space-y-2">
                {diff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ingen forskjeller funnet.</p>
                ) : (
                  diff.map((change) => (
                    <div
                      key={change.key}
                      className={`rounded border p-2 text-sm ${
                        change.type === "added"
                          ? "border-green-200 bg-green-50"
                          : change.type === "removed"
                            ? "border-red-200 bg-red-50"
                            : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <span className="font-mono text-xs font-medium">{change.key}</span>
                      <span className="ml-2 text-xs">
                        {change.type === "added" && "Lagt til"}
                        {change.type === "removed" && "Fjernet"}
                        {change.type === "changed" && "Endret"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Tidslinje */}
        <div id="changelog-content" className="space-y-3">
          {versions.length > 0 ? (
            versions.map((version) => (
              <div
                key={version.id}
                className="rounded-lg border p-4 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {version.changeNumber}
                    </Badge>
                    <span className="text-sm font-medium">
                      Versjon {version.versionNumber}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleDateString("nb-NO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm">{version.changeSummary}</p>
                {version.changeReason && (
                  <p className="text-xs text-muted-foreground">
                    Begrunnelse: {version.changeReason}
                  </p>
                )}
                {version.legalReference && (
                  <p className="text-xs text-muted-foreground">
                    Lovforankring: {version.legalReference}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Av {version.changedBy.name || version.changedBy.email}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Ingen endringer er registrert ennå. Endringer logges automatisk ved redigering.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
