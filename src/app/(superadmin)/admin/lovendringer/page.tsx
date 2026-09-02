"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_INDUSTRIES } from "@/lib/pricing";
import {
  dismissLawChange,
  listLawChangesAdmin,
  publishLawChange,
  runLawChangeScanNow,
} from "@/server/actions/law-change.actions";

type LawChangeRow = {
  id: string;
  source: string;
  title: string;
  sourceUrl: string;
  status: "DETECTED" | "PUBLISHED" | "DISMISSED";
  matchedKeywords: unknown;
  affectedIndustries: unknown;
  customerSummary: string | null;
  notifiedTenantCount: number;
  createdAt: string;
  notifiedAt: string | null;
};

type LastScan = {
  startedAt: string;
  finishedAt: string;
  fetched: number;
  matched: number;
  created: number;
  error: string | null;
} | null;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function statusLabel(status: LawChangeRow["status"]): string {
  if (status === "PUBLISHED") return "Varslet";
  if (status === "DISMISSED") return "Avvist";
  return "Ny";
}

export default function AdminLawChangesPage() {
  const { toast } = useToast();
  const [changes, setChanges] = useState<LawChangeRow[]>([]);
  const [lastScan, setLastScan] = useState<LastScan>(null);
  const [detectedCount, setDetectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [industries, setIndustries] = useState<Record<string, string[]>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await listLawChangesAdmin();
    if (result.success && result.data) {
      setChanges(result.data.changes);
      setLastScan(result.data.lastScan);
      setDetectedCount(result.data.detectedCount);
      const nextIndustries: Record<string, string[]> = {};
      for (const change of result.data.changes as LawChangeRow[]) {
        nextIndustries[change.id] = asStringArray(change.affectedIndustries);
      }
      setIndustries(nextIndustries);
    } else if (!result.success) {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleScan() {
    setScanning(true);
    const result = await runLawChangeScanNow();
    if (result.success && result.data) {
      toast({
        title: "Skanning ferdig",
        description: `${result.data.fetched} hentet, ${result.data.matched} relevante, ${result.data.created} nye.`,
      });
      await load();
    } else if (!result.success) {
      toast({ variant: "destructive", title: "Skanning feilet", description: result.error });
    }
    setScanning(false);
  }

  function toggleIndustry(changeId: string, value: string) {
    setIndustries((prev) => {
      const current = prev[changeId] ?? ["all"];
      if (value === "all") return { ...prev, [changeId]: ["all"] };
      const withoutAll = current.filter((item) => item !== "all");
      const next = withoutAll.includes(value)
        ? withoutAll.filter((item) => item !== value)
        : [...withoutAll, value];
      return { ...prev, [changeId]: next.length ? next : ["all"] };
    });
  }

  async function handlePublish(change: LawChangeRow) {
    const summary = (summaries[change.id] ?? change.customerSummary ?? "").trim();
    setPublishingId(change.id);
    const result = await publishLawChange({
      id: change.id,
      customerSummary: summary,
      affectedIndustries: industries[change.id] ?? ["all"],
    });
    if (result.success) {
      toast({
        title: "Varsel sendt",
        description: `${result.notified} bedrifter er varslet.`,
      });
      await load();
    } else {
      toast({ variant: "destructive", title: "Kunne ikke varsle", description: result.error });
    }
    setPublishingId(null);
  }

  async function handleDismiss(id: string) {
    const result = await dismissLawChange(id);
    if (result.success) {
      await load();
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
  }

  if (loading) {
    return <div className="p-8">Laster...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lov- og forskriftsendringer</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Skannes automatisk hver mandag. Oppdater teksten i{" "}
            <a href="/admin/legal-references" className="underline">juridisk register</a>
            {" "}ved behov, og varsle berørte bedrifter.
          </p>
        </div>
        <Button onClick={handleScan} disabled={scanning}>
          <RefreshCw className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Skanner..." : "Skann nå"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nye treff</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{detectedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Siste skanning</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {lastScan
              ? `${new Date(lastScan.startedAt).toLocaleString("nb-NO")} · ${lastScan.fetched} hentet, ${lastScan.created} nye`
              : "Ikke kjørt ennå"}
            {lastScan?.error && <p className="text-destructive mt-1">{lastScan.error}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hjemmel</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            IK-HMS § 5 nr. 1 og nr. 2. Automatisk skanning hver mandag kl. 06.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Treff ({changes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {changes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Ingen treff ennå. Kjør en skanning for å hente nye kunngjøringer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endring</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[420px]">Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map((change) => {
                  const selected = industries[change.id] ?? ["all"];
                  const keywords = asStringArray(change.matchedKeywords);
                  return (
                    <TableRow key={change.id}>
                      <TableCell className="align-top">
                        <p className="font-medium">{change.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {change.source === "LOVTIDEND" ? "Norsk Lovtidend" : "Arbeidstilsynet"}
                          {keywords.length > 0 && ` · ${keywords.slice(0, 4).join(", ")}`}
                        </p>
                        <a
                          href={change.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary mt-1"
                        >
                          Åpne kilde <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={change.status === "PUBLISHED" ? "default" : "outline"}>
                          {statusLabel(change.status)}
                        </Badge>
                        {change.status === "PUBLISHED" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {change.notifiedTenantCount} bedrifter
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {change.status === "DETECTED" ? (
                          <div className="space-y-3">
                            <Textarea
                              rows={3}
                              placeholder="Kort forklaring til bedriftene: hva som er endret og hva de bør sjekke."
                              value={summaries[change.id] ?? ""}
                              onChange={(e) =>
                                setSummaries((prev) => ({ ...prev, [change.id]: e.target.value }))
                              }
                            />
                            <div className="flex flex-wrap gap-1">
                              <Badge
                                variant={selected.includes("all") ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => toggleIndustry(change.id, "all")}
                              >
                                Alle bransjer
                              </Badge>
                              {SUPPORTED_INDUSTRIES.map((industry) => (
                                <Badge
                                  key={industry.value}
                                  variant={selected.includes(industry.value) ? "default" : "outline"}
                                  className="cursor-pointer"
                                  onClick={() => toggleIndustry(change.id, industry.value)}
                                >
                                  {industry.label}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handlePublish(change)}
                                disabled={publishingId === change.id}
                              >
                                {publishingId === change.id ? "Varsler..." : "Oppdater og varsle"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDismiss(change.id)}
                              >
                                Ikke relevant
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {change.customerSummary ?? "Ingen kommentar"}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
