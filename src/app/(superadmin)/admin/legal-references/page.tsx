"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, ExternalLink } from "lucide-react";
import {
  getPaginatedLegalReferencesAdmin,
  createLegalReference,
  updateLegalReference,
  deleteLegalReference,
} from "@/server/actions/legal-reference.actions";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_INDUSTRIES } from "@/lib/pricing";
import { AdminPagination, AdminPaginationSearch } from "@/components/admin-pagination";

const INDUSTRY_OPTIONS = [
  { value: "all", label: "Alle bransjer" },
  ...SUPPORTED_INDUSTRIES.map((i) => ({ value: i.value, label: i.label })),
];

function industriesToLabel(industries: unknown): string {
  if (!industries || !Array.isArray(industries)) return "-";
  if (industries.includes("all")) return "Alle bransjer";
  return industries
    .map(
      (v) =>
        INDUSTRY_OPTIONS.find((o) => o.value === v)?.label ?? v
    )
    .join(", ");
}

const ITEMS_PER_PAGE = 25;

export default function AdminLegalReferencesPage() {
  const { toast } = useToast();
  const searchParamsObj = useSearchParams();
  const [refs, setRefs] = useState<Array<{ id: string; title: string; paragraphRef: string | null; description: string; sourceUrl: string; industries: unknown; sortOrder: number; lastVerifiedAt: Date | null }>>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["all"]);

  const currentPage = Math.max(1, parseInt(searchParamsObj.get("page") || "1", 10));
  const searchTerm = searchParamsObj.get("search")?.trim() || "";
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  useEffect(() => {
    loadRefs();
  }, [currentPage, searchTerm]);

  async function loadRefs() {
    setLoading(true);
    const result = await getPaginatedLegalReferencesAdmin(currentPage, searchTerm);
    if (result.success && result.data) {
      setRefs(result.data);
      setTotalItems(result.total);
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setSelectedIndustries(["all"]);
    setDialogOpen(true);
  }

  function openEdit(ref: (typeof refs)[0]) {
    setEditingId(ref.id);
    const ind = ref.industries as string[];
    setSelectedIndustries(ind?.length ? ind : ["all"]);
    setDialogOpen(true);
  }

  function toggleIndustry(value: string) {
    if (value === "all") {
      setSelectedIndustries(["all"]);
    } else {
      setSelectedIndustries((prev) => {
        const withoutAll = prev.filter((p) => p !== "all");
        if (withoutAll.includes(value)) {
          const next = withoutAll.filter((p) => p !== value);
          return next.length ? next : ["all"];
        }
        return [...withoutAll, value];
      });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("industries", selectedIndustries.join(","));
    formData.set("sortOrder", (formData.get("sortOrder") as string) || "0");

    const result = editingId
      ? await updateLegalReference(editingId, formData)
      : await createLegalReference(formData);

    if (result.success) {
      toast({ title: "Lagret", description: "Referansen er lagret" });
      setDialogOpen(false);
      loadRefs();
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Slett «${title}»?`)) return;
    const result = await deleteLegalReference(id);
    if (result.success) {
      toast({ title: "Slettet", description: "Referansen er fjernet" });
      loadRefs();
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
  }

  const editingRef = editingId ? refs.find((r) => r.id === editingId) : null;

  if (loading) {
    return <div className="p-8">Laster...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Juridisk register</h1>
          <p className="text-muted-foreground">
            Administrer lover og forskrifter per bransje. Vises for kunder basert på deres bransje.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Ny referanse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Rediger referanse" : "Ny juridisk referanse"}</DialogTitle>
            </DialogHeader>
            <form key={editingId ?? "new"} onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Tittel *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={editingRef?.title}
                  placeholder="f.eks. Arbeidsmiljøloven"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="paragraphRef">Paragrafreferanse</Label>
                <Input
                  id="paragraphRef"
                  name="paragraphRef"
                  defaultValue={editingRef?.paragraphRef ?? ""}
                  placeholder="f.eks. § 3-2 eller Kapittel 10"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="description">Beskrivelse *</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  defaultValue={editingRef?.description}
                  placeholder="Kort beskrivelse av hva som gjelder"
                  rows={3}
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="sourceUrl">Kilde-URL (Lovdata m.m.) *</Label>
                <Input
                  id="sourceUrl"
                  name="sourceUrl"
                  type="url"
                  required
                  defaultValue={editingRef?.sourceUrl}
                  placeholder="https://lovdata.no/..."
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>Bransjer *</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Velg «Alle bransjer» eller spesifikke bransjer som referansen gjelder for.
                </p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <Badge
                      key={opt.value}
                      variant={selectedIndustries.includes(opt.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleIndustry(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="sortOrder">Rekkefølge</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  defaultValue={editingRef?.sortOrder ?? 0}
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Lagrer..." : "Lagre"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Referanser ({totalItems})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Kunder ser bare referanser som gjelder for deres bransje.
              </p>
            </div>
            <AdminPaginationSearch
              basePath="/admin/legal-references"
              searchTerm={searchTerm}
              placeholder="Søk på tittel, beskrivelse, paragraf..."
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tittel</TableHead>
                <TableHead>Paragraf</TableHead>
                <TableHead>Bransjer</TableHead>
                <TableHead>Rekkefølge</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Ingen referanser. Legg til lover og forskrifter med tilhørende bransjer.
                  </TableCell>
                </TableRow>
              ) : (
                refs.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-medium">{ref.title}</TableCell>
                    <TableCell>{ref.paragraphRef ?? "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm">{industriesToLabel(ref.industries)}</span>
                    </TableCell>
                    <TableCell>{ref.sortOrder}</TableCell>
                    <TableCell className="text-right">
                      <a href={ref.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="mr-1">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(ref)} className="mr-1">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ref.id, ref.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/admin/legal-references"
        searchTerm={searchTerm}
      />
    </div>
  );
}
