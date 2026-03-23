"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Trash2, Upload, Calendar, Building2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createElectroComplianceDeclaration,
  deleteElectroComplianceDeclaration,
} from "@/server/actions/electro.actions";
import { useToast } from "@/hooks/use-toast";

const COMPLIANCE_CATEGORIES = [
  { value: "ELEKTRO", label: "Elektro", variant: "default" as const },
  { value: "RORLEGGER", label: "Rørlegger", variant: "secondary" as const },
  { value: "VENTILASJON", label: "Ventilasjon", variant: "outline" as const },
  { value: "BRANN", label: "Brann", variant: "destructive" as const },
  { value: "ANNET", label: "Annet", variant: "outline" as const },
] as const;

function categoryLabel(key: string): string {
  return COMPLIANCE_CATEGORIES.find((c) => c.value === key)?.label ?? key;
}

function categoryBadgeVariant(key: string) {
  return COMPLIANCE_CATEGORIES.find((c) => c.value === key)?.variant ?? ("outline" as const);
}

type ComplianceRow = {
  id: string;
  title: string;
  category?: string;
  originalFileName: string;
  fileKey: string;
  mime: string;
  contractorName: string | null;
  workCompletedAt: string | null;
  notes: string | null;
  createdAt: string;
  createdById: string | null;
};

interface ElectroAdminPanelProps {
  compliance: ComplianceRow[];
  currentUserId: string;
  canCreate: boolean;
  canDeleteAny: boolean;
}

function formatDate(d: string | null): string {
  if (!d) return "";
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("nb-NO");
}

const PAGE_SIZE = 10;

export function ElectroAdminPanel({
  compliance,
  currentUserId,
  canCreate,
  canDeleteAny,
}: ElectroAdminPanelProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const canRemoveRow = (createdById: string | null) =>
    canDeleteAny || (!!createdById && createdById === currentUserId && canCreate);

  const filtered = useMemo(() => {
    let rows = compliance;
    if (filterCategory !== "all") {
      rows = rows.filter((r) => (r.category ?? "ELEKTRO") === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.originalFileName.toLowerCase().includes(q) ||
          (r.contractorName?.toLowerCase().includes(q) ?? false) ||
          (r.notes?.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  }, [compliance, filterCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const categoryCounts = COMPLIANCE_CATEGORIES.map((cat) => ({
    ...cat,
    count: compliance.filter((r) => (r.category ?? "ELEKTRO") === cat.value).length,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Samsvarserklæringer</CardTitle>
            <CardDescription className="mt-1">
              Erklæringer fra autorisert personell etter installasjon, kontroll eller verifikasjon.
            </CardDescription>
          </div>
          {canCreate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Legg til
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Ny samsvarserklæring</DialogTitle>
                  <DialogDescription>
                    Last opp signert erklæring. Velg kategori for å skille mellom fag.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  action={(fd) => {
                    startTransition(async () => {
                      const r = await createElectroComplianceDeclaration(fd);
                      if (r.success) {
                        toast({ title: "Lagret", description: "Samsvarserklæringen er lastet opp." });
                        setDialogOpen(false);
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Kunne ikke laste opp",
                          description: r.error.message,
                        });
                      }
                    });
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="ec-title">Tittel / sted *</Label>
                      <Input
                        id="ec-title"
                        name="title"
                        required
                        placeholder="F.eks. Hovedtavle, lager – kontroll 2025"
                        maxLength={200}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ec-category">Kategori</Label>
                      <select
                        id="ec-category"
                        name="category"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        defaultValue="ELEKTRO"
                      >
                        {COMPLIANCE_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ec-contractor">Utførende firma</Label>
                      <Input id="ec-contractor" name="contractorName" placeholder="Valgfritt" maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ec-date">Dato for utført arbeid</Label>
                      <Input id="ec-date" name="workCompletedAt" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ec-file">Fil (PDF, Word eller bilde) *</Label>
                      <Input
                        id="ec-file"
                        name="file"
                        type="file"
                        required
                        accept=".pdf,.docx,image/jpeg,image/png,image/webp"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="ec-notes">Notat</Label>
                      <Textarea id="ec-notes" name="notes" rows={2} placeholder="Valgfritt" maxLength={4000} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Avbryt
                    </Button>
                    <Button type="submit" disabled={pending}>
                      <Upload className="h-4 w-4 mr-2" />
                      Last opp
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {compliance.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={filterCategory === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleCategoryChange("all")}
              >
                Alle ({compliance.length})
              </Button>
              {categoryCounts
                .filter((c) => c.count > 0)
                .map((cat) => (
                  <Button
                    key={cat.value}
                    variant={filterCategory === cat.value ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCategoryChange(cat.value)}
                  >
                    {cat.label} ({cat.count})
                  </Button>
                ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Søk på tittel, firma eller filnavn…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
        )}

        {compliance.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ingen samsvarserklæringer er registrert ennå.{" "}
            {canCreate ? "Klikk «Legg til» for å laste opp." : ""}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ingen erklæringer matcher søket.
          </p>
        ) : (
          <div className="space-y-3">
            {paged.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold leading-snug">{row.title}</span>
                    <Badge variant={categoryBadgeVariant(row.category ?? "ELEKTRO")}>
                      {categoryLabel(row.category ?? "ELEKTRO")}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {row.contractorName && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {row.contractorName}
                      </span>
                    )}
                    {row.workCompletedAt && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(row.workCompletedAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{row.originalFileName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/api/files/${row.fileKey}`} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-1" />
                      Åpne
                    </Link>
                  </Button>
                  {canRemoveRow(row.createdById) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const r = await deleteElectroComplianceDeclaration(row.id);
                          if (r.success) {
                            toast({ title: "Slettet" });
                          } else {
                            toast({
                              variant: "destructive",
                              title: "Kunne ikke slette",
                              description: r.error.message,
                            });
                          }
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Viser {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} av {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
