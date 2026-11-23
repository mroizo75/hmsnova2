"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import {
  PRODUCT_UPDATE_KINDS,
  PRODUCT_UPDATE_KIND_LABELS,
  formatUpgradeSchedule,
  toDatetimeLocalValue,
  type ProductUpdateKindValue,
} from "@/lib/product-updates";
import {
  archiveProductUpdate,
  deleteProductUpdateDraft,
  listProductUpdatesAdmin,
  publishProductUpdate,
  saveProductUpdateDraft,
} from "@/server/actions/product-update.actions";

type AdminUpdate = {
  id: string;
  kind: ProductUpdateKindValue;
  title: string;
  body: string;
  scheduledAt: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  createdAt: string;
  notifiedTenantCount: number;
  createdBy: { name: string | null };
  _count: { reads: number };
};

const STATUS_LABEL: Record<AdminUpdate["status"], string> = {
  DRAFT: "Utkast",
  PUBLISHED: "Publisert",
  ARCHIVED: "Arkivert",
};

function formatWhen(value: string | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminProductUpdates() {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<AdminUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ProductUpdateKindValue>("NEW_FEATURE");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  async function load() {
    setLoading(true);
    const result = await listProductUpdatesAdmin();
    if (result.success) {
      setUpdates(result.data as AdminUpdate[]);
    } else {
      toast({ variant: "destructive", title: "Feil", description: result.error });
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setKind("NEW_FEATURE");
    setTitle("");
    setBody("");
    setScheduledAt("");
  }

  function editDraft(update: AdminUpdate) {
    setEditingId(update.id);
    setKind(update.kind);
    setTitle(update.title);
    setBody(update.body);
    setScheduledAt(toDatetimeLocalValue(update.scheduledAt));
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveProductUpdateDraft({
      id: editingId ?? undefined,
      kind,
      title,
      body,
      scheduledAt: kind === "PLANNED" ? scheduledAt : null,
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
      return;
    }
    toast({ title: editingId ? "Utkast oppdatert" : "Utkast lagret" });
    resetForm();
    await load();
  }

  async function confirmPublish(update: AdminUpdate) {
    const result = await publishProductUpdate(update.id);
    if (!result.success) {
      toast({ variant: "destructive", title: "Kunne ikke publisere", description: result.error });
      return;
    }
    toast({ title: "Publisert", description: `Varsel sendt til ${result.notified} bedrifter.` });
    await load();
  }

  function handlePublish(update: AdminUpdate) {
    toast({
      title: "Publiser systembeskjeden?",
      description: "Administrator, HMS-ansvarlig og leder får varsel. Teksten er lik for alle bedrifter.",
      action: (
        <ToastAction altText="Publiser" onClick={() => void confirmPublish(update)}>
          Publiser
        </ToastAction>
      ),
    });
  }

  async function handleArchive(id: string) {
    const result = await archiveProductUpdate(id);
    if (!result.success) {
      toast({ variant: "destructive", title: "Kunne ikke arkivere", description: result.error });
      return;
    }
    await load();
  }

  async function handleDelete(id: string) {
    const result = await deleteProductUpdateDraft(id);
    if (!result.success) {
      toast({ variant: "destructive", title: "Kunne ikke slette", description: result.error });
      return;
    }
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Systembeskjeder</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Korte beskjeder som vises likt for alle bedrifter. Ikke skriv kundenavn eller interne forhold.
          Når du publiserer, får administrator, HMS-ansvarlig og leder et varsel, og alle ser et merke på Systembeskjeder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Rediger utkast" : "Ny systembeskjed"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-update-kind">Type</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as ProductUpdateKindValue)}>
              <SelectTrigger id="product-update-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_UPDATE_KINDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRODUCT_UPDATE_KIND_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {kind === "PLANNED" ? (
            <div className="space-y-2">
              <Label htmlFor="product-update-when">Dag og klokkeslett for oppgraderingen</Label>
              <Input
                id="product-update-when"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Norsk tid. Tidspunktet vises tydelig i beskjeden og i varselet.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="product-update-title">Tittel</Label>
            <Input
              id="product-update-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="For eksempel: Sjekklister kan fylles ut på mobil"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-update-body">Tekst</Label>
            <Textarea
              id="product-update-body"
              value={body}
              maxLength={2000}
              rows={5}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Hva er nytt, forbedret eller planlagt. Samme tekst til alle."
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Lagrer…" : editingId ? "Oppdater utkast" : "Lagre utkast"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Avbryt
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publiserte og utkast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Henter…</p> : null}
          {!loading && updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen systembeskjeder ennå.</p>
          ) : null}
          {updates.map((update) => (
            <article key={update.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{PRODUCT_UPDATE_KIND_LABELS[update.kind]}</Badge>
                <Badge variant={update.status === "PUBLISHED" ? "default" : "outline"}>
                  {STATUS_LABEL[update.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatWhen(update.publishedAt ?? update.createdAt)}</span>
              </div>
              <h2 className="mt-2 font-semibold">{update.title}</h2>
              {update.scheduledAt ? (
                <p className="mt-2 rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
                  Oppgradering {formatUpgradeSchedule(update.scheduledAt)}
                </p>
              ) : null}
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{update.body}</p>
              {update.status !== "DRAFT" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Varslet {update.notifiedTenantCount} bedrifter · åpnet av {update._count.reads} brukere
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {update.status === "DRAFT" ? (
                  <>
                    <Button type="button" size="sm" variant="outline" onClick={() => editDraft(update)}>
                      Rediger
                    </Button>
                    <Button type="button" size="sm" onClick={() => void handlePublish(update)}>
                      Publiser
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void handleDelete(update.id)}>
                      Slett
                    </Button>
                  </>
                ) : null}
                {update.status === "PUBLISHED" ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleArchive(update.id)}>
                    Arkiver
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
