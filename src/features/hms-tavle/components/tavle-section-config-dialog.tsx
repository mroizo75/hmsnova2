"use client";

import { useState, useRef } from "react";
import { toImageUrl } from "@/features/hms-tavle/lib/image-url";
import {
  ALLE_SNARVEIER,
  DEFAULT_SNARVEIER_CONFIG,
  type SnarveiConfig,
} from "@/features/hms-tavle/lib/snarveier-config";
import {
  GUEST_TYPE_VALUES,
  TRUST_PANEL_MIN_VOLUME,
  type GuestType,
} from "@/features/hms-tavle/lib/gjesteservice-config";
import { getGuestDictionary, GUEST_TYPE_EMOJI } from "@/features/hms-tavle/lib/guest-i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { HmsTavleSectionType } from "@prisma/client";
import { Upload, Loader2, X, Plus, FileText, Image as ImageIcon, ExternalLink, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  type: HmsTavleSectionType;
  config: Record<string, any>;
  isAddon: boolean;
  tavleId: string;
  onSave: (config: Record<string, any>) => void;
}

/* ─── Fil-opplaster (gjenbrukbar) ─── */
function FileUploader({
  label, accept, currentUrl, tavleId, onUploaded,
}: {
  label: string; accept: string; currentUrl?: string; tavleId: string; onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tavleId", tavleId);
      const res = await fetch("/api/hms-tavle/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Opplasting feilet");
      onUploaded(json.data.url);
      toast.success("Fil lastet opp");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {currentUrl && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded px-3 py-1.5">
          <FileText className="h-4 w-4 shrink-0" />
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:underline flex-1">
            {currentUrl.split("/").pop()}
          </a>
          <button onClick={() => onUploaded("")} className="text-gray-400 hover:text-red-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Lim inn URL..."
          value={currentUrl ?? ""}
          onChange={(e) => onUploaded(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

/* ─── SHA-plan konfig ─── */
function ShaPlanConfig({ cfg, set, tavleId, isAddon }: { cfg: any; set: (k: string, v: any) => void; tavleId: string; isAddon: boolean }) {
  if (isAddon) return <p className="text-sm text-muted-foreground">HMS Nova-tilkobling: SHA-planstatus hentes automatisk fra prosjektet.</p>;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={cfg.status ?? "ikke-satt"} onValueChange={(v) => set("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="godkjent">✅ Godkjent og aktiv</SelectItem>
            <SelectItem value="under-arbeid">⚠️ Under arbeid</SelectItem>
            <SelectItem value="ikke-satt">— Ikke satt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Versjon</Label>
          <Input placeholder="f.eks. 3.0" value={cfg.version ?? ""} onChange={(e) => set("version", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Godkjent dato</Label>
          <Input type="date" value={cfg.approvedDate ?? ""} onChange={(e) => set("approvedDate", e.target.value)} />
        </div>
      </div>
      <FileUploader label="SHA-plan PDF" accept=".pdf" currentUrl={cfg.pdfUrl} tavleId={tavleId} onUploaded={(url) => set("pdfUrl", url)} />
      <FileUploader label="Riggplan / bilde" accept="image/*,.pdf" currentUrl={cfg.imageUrl} tavleId={tavleId} onUploaded={(url) => set("imageUrl", url)} />
    </div>
  );
}

/* ─── Beredskapsplan konfig ─── */
function BeredskapsConfig({ cfg, set, tavleId }: { cfg: any; set: (k: string, v: any) => void; tavleId: string }) {
  return (
    <div className="space-y-4">
      <FileUploader label="Beredskapsplan PDF" accept=".pdf" currentUrl={cfg.pdfUrl} tavleId={tavleId} onUploaded={(url) => set("pdfUrl", url)} />
      <FileUploader label="Bilde (valgfritt)" accept="image/*" currentUrl={cfg.imageUrl} tavleId={tavleId} onUploaded={(url) => set("imageUrl", url)} />
      <div className="space-y-1.5">
        <Label>Egendefinerte steg ved ulykke (én per linje)</Label>
        <Textarea
          rows={4}
          placeholder={"1. Ring 113\n2. Sikre området\n3. Varsle leder"}
          value={(cfg.customSteps ?? []).join("\n")}
          onChange={(e) => set("customSteps", e.target.value.split("\n").filter(Boolean))}
        />
      </div>
    </div>
  );
}

/* ─── Avvik statistikk (manuell) ─── */
function AvvikConfig({ cfg, set, isAddon }: { cfg: any; set: (k: string, v: any) => void; isAddon: boolean }) {
  if (isAddon) return <p className="text-sm text-muted-foreground">HMS Nova-tilkobling: Avviksstatistikk hentes automatisk.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Oppdater tallene manuelt når du ønsker å vise statistikk på tavlen.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: "openCount", label: "Åpne avvik" },
          { key: "criticalCount", label: "Kritiske" },
          { key: "closedThisMonth", label: "Lukket denne mnd." },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label>{label}</Label>
            <Input type="number" min={0} value={cfg[key] ?? ""} onChange={(e) => set(key, parseInt(e.target.value) || 0)} />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label>Sist oppdatert</Label>
        <Input type="date" value={cfg.lastUpdated ?? new Date().toISOString().slice(0, 10)} onChange={(e) => set("lastUpdated", e.target.value)} />
      </div>
    </div>
  );
}

/** Tallfelter som fylles inn manuelt av standalone-kunder */
function TallConfig({
  cfg,
  set,
  felter,
  hjelpetekst,
  isAddon,
}: {
  cfg: any;
  set: (k: string, v: any) => void;
  felter: ReadonlyArray<{ key: string; label: string }>;
  hjelpetekst: string;
  isAddon: boolean;
}) {
  if (isAddon) {
    return (
      <p className="text-sm text-muted-foreground">
        HMS Nova-tilkobling: tallene hentes automatisk fra systemet.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{hjelpetekst}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {felter.map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label>{label}</Label>
            <Input
              type="number"
              min={0}
              value={cfg[key] ?? ""}
              onChange={(e) => set(key, parseInt(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Vernerunde (manuell) ─── */
function VernerundeConfig({ cfg, set, isAddon }: { cfg: any; set: (k: string, v: any) => void; isAddon: boolean }) {
  if (isAddon) {
    return (
      <p className="text-sm text-muted-foreground">
        HMS Nova-tilkobling: vernerunder og åpne funn hentes automatisk.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vernerunder dokumenterer den systematiske kartleggingen etter arbeidsmiljøloven § 3-1.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Sist gjennomført</Label>
          <Input
            type="date"
            value={cfg.lastCompletedAt ?? ""}
            onChange={(e) => set("lastCompletedAt", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Neste planlagt</Label>
          <Input
            type="date"
            value={cfg.nextPlannedAt ?? ""}
            onChange={(e) => set("nextPlannedAt", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Åpne funn</Label>
          <Input
            type="number"
            min={0}
            value={cfg.openFindings ?? ""}
            onChange={(e) => set("openFindings", parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Gjennomført siste 12 mnd.</Label>
          <Input
            type="number"
            min={0}
            value={cfg.completedLast12Months ?? ""}
            onChange={(e) => set("completedLast12Months", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Aktive SJA (manuell) ─── */
function SjaConfig({ cfg, set, isAddon }: { cfg: any; set: (k: string, v: any) => void; isAddon: boolean }) {
  if (isAddon) {
    return (
      <p className="text-sm text-muted-foreground">
        HMS Nova-tilkobling: aktive sikker jobb-analyser hentes automatisk fra prosjektet.
      </p>
    );
  }

  const items: any[] = cfg.items ?? [];

  function oppdater(index: number, key: string, value: string) {
    const neste = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    set("items", neste);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Vis planlagt arbeid som krever egen sikker jobb-analyse.
      </p>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 border rounded-lg p-3">
          <Input
            placeholder="Tittel på arbeidet"
            value={item.title ?? ""}
            onChange={(e) => oppdater(i, "title", e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Sted"
              value={item.workLocation ?? ""}
              onChange={(e) => oppdater(i, "workLocation", e.target.value)}
            />
            <Input
              placeholder="Ansvarlig"
              value={item.responsibleName ?? ""}
              onChange={(e) => oppdater(i, "responsibleName", e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={item.plannedDate ?? ""}
              onChange={(e) => oppdater(i, "plannedDate", e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 shrink-0"
              onClick={() => set("items", items.filter((_, index) => index !== i))}
            >
              Fjern
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => set("items", [...items, { title: "", workLocation: "", responsibleName: "", plannedDate: "" }])}
      >
        Legg til SJA
      </Button>
    </div>
  );
}

/* ─── HMS-årshjul (manuell) ─── */
function AarshjulConfig({ cfg, set, isAddon }: { cfg: any; set: (k: string, v: any) => void; isAddon: boolean }) {
  if (isAddon) {
    return (
      <p className="text-sm text-muted-foreground">
        HMS Nova-tilkobling: framdriften i årsplanen hentes automatisk.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Årshjulet viser hvor langt virksomheten er kommet i den systematiske gjennomgangen
        etter internkontrollforskriften § 5.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>År</Label>
          <Input
            type="number"
            value={cfg.year ?? new Date().getFullYear()}
            onChange={(e) => set("year", parseInt(e.target.value) || new Date().getFullYear())}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Gjennomførte punkter</Label>
          <Input
            type="number"
            min={0}
            value={cfg.completed ?? ""}
            onChange={(e) => set("completed", parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Punkter totalt</Label>
          <Input
            type="number"
            min={1}
            value={cfg.total ?? ""}
            onChange={(e) => set("total", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Fremdriftsplan / Riggplan ─── */
function FremdriftsplanConfig({ cfg, set, tavleId }: { cfg: any; set: (k: string, v: any) => void; tavleId: string }) {
  return (
    <div className="space-y-4">
      <FileUploader label="Fremdriftsplan bilde / PDF" accept="image/*,.pdf" currentUrl={cfg.imageUrl ?? cfg.pdfUrl} tavleId={tavleId} onUploaded={(url) => set(url.endsWith(".pdf") ? "pdfUrl" : "imageUrl", url)} />
      <div className="space-y-1.5">
        <Label>Beskrivelse (vises under bildet)</Label>
        <Input placeholder="f.eks. Uke 26–30 · Grunnarbeid ferdig" value={cfg.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Startdato</Label>
          <Input type="date" value={cfg.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sluttdato</Label>
          <Input type="date" value={cfg.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

/* ─── Riggplan ─── */
function RiggplanConfig({ cfg, set, tavleId }: { cfg: any; set: (k: string, v: any) => void; tavleId: string }) {
  // Normaliser til images-array (bakoverkompatibelt med gammelt enkeltbilde-felt)
  const images: { url: string; caption: string }[] = cfg.images && cfg.images.length > 0
    ? cfg.images
    : cfg.imageUrl
      ? [{ url: cfg.imageUrl, caption: cfg.caption ?? "" }]
      : [];

  function updateImages(updated: { url: string; caption: string }[]) {
    set("images", updated);
    // Sett også imageUrl til første bilde for bakoverkompatibilitet
    set("imageUrl", updated[0]?.url ?? "");
    set("caption", updated[0]?.caption ?? "");
  }

  function addImage(url: string) {
    updateImages([...images, { url, caption: "" }]);
  }

  function removeImage(i: number) {
    updateImages(images.filter((_, idx) => idx !== i));
  }

  function updateCaption(i: number, caption: string) {
    updateImages(images.map((img, idx) => idx === i ? { ...img, caption } : img));
  }

  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("tavleId", tavleId);
      const res = await fetch("/api/hms-tavle/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Opplasting feilet");
      addImage(data.data.url);
      toast.success("Bilde lastet opp");
    } catch (e: any) {
      toast.error(e.message ?? "Opplasting feilet");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Last opp ett eller flere bilder av riggplan / situasjonskart. På tavlen vises 1 bilde i full bredde, 2 bilder side om side, og 3+ bilder som automatisk karusell.
      </p>

      {/* Eksisterende bilder */}
      {images.length > 0 && (
        <div className="space-y-3">
          <Label>Opplastede bilder ({images.length})</Label>
          {images.map((img, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                  Bilde {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="ml-auto text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <img
                src={toImageUrl(img.url)}
                alt={img.caption || `Bilde ${i + 1}`}
                className="w-full object-contain max-h-32 rounded border bg-muted"
              />
              <Input
                placeholder={`Bildetittel (valgfritt) — f.eks. "Etasje 2"`}
                value={img.caption}
                onChange={(e) => updateCaption(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Last opp nytt bilde */}
      <div className="space-y-1.5">
        <Label>Legg til bilde</Label>
        <label className="flex flex-col items-center gap-2 border-2 border-dashed rounded-lg p-5 cursor-pointer hover:border-primary transition-colors">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Klikk for å laste opp (JPEG, PNG, WebP)</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <FileUploader
        label="PDF-versjon (valgfritt — vises som «Åpne PDF»-knapp)"
        accept=".pdf"
        currentUrl={cfg.pdfUrl}
        tavleId={tavleId}
        onUploaded={(url) => set("pdfUrl", url)}
      />

      <div className="space-y-1.5">
        <Label>Sist oppdatert</Label>
        <Input
          type="date"
          value={cfg.updatedDate ?? ""}
          onChange={(e) => set("updatedDate", e.target.value)}
        />
      </div>
    </div>
  );
}

/* ─── Kontaktinfo (verneombud/nødetater) ─── */
function KontaktConfig({ cfg, set }: { cfg: any; set: (k: string, v: any) => void }) {
  const contacts: any[] = cfg.contacts ?? [];

  function update(i: number, field: string, val: string) {
    const updated = contacts.map((c, idx) => idx === i ? { ...c, [field]: val } : c);
    set("contacts", updated);
  }

  function add() {
    set("contacts", [...contacts, { name: "", role: "", phone: "", email: "" }]);
  }

  function remove(i: number) {
    set("contacts", contacts.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Disse kontaktene vises alltid i venstre panel på tavlen.</p>
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30 relative">
            <button onClick={() => remove(i)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
              <X className="h-3.5 w-3.5" />
            </button>
            <Input placeholder="Fullt navn" value={c.name} onChange={(e) => update(i, "name", e.target.value)} />
            <Input placeholder="Rolle (f.eks. Verneombud)" value={c.role} onChange={(e) => update(i, "role", e.target.value)} />
            <Input placeholder="Telefon" value={c.phone} onChange={(e) => update(i, "phone", e.target.value)} />
            <Input placeholder="E-post (valgfritt)" value={c.email ?? ""} onChange={(e) => update(i, "email", e.target.value)} />
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1.5" /> Legg til kontaktperson
      </Button>
    </div>
  );
}

/* ─── Meldinger / Nyheter ─── */
function NyheterConfig({ cfg, set }: { cfg: any; set: (k: string, v: any) => void }) {
  const messages: string[] = cfg.messages ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Meldinger vises på tavlen (én per linje).</p>
      <Textarea
        rows={6}
        placeholder={"Husk solkrem og rikelig med vann i varmen\nArbeidsmøte kl 14:00 i brakkeriggen\nNytt HMS-kurs torsdag 10. juli"}
        value={messages.join("\n")}
        onChange={(e) => set("messages", e.target.value.split("\n").filter(Boolean))}
      />
    </div>
  );
}

/* ─── Generisk bilde-/PDF-seksjon ─── */
function GenericMediaConfig({ cfg, set, tavleId }: { cfg: any; set: (k: string, v: any) => void; tavleId: string }) {
  return (
    <div className="space-y-4">
      <FileUploader label="Bilde" accept="image/*" currentUrl={cfg.imageUrl} tavleId={tavleId} onUploaded={(url) => set("imageUrl", url)} />
      <FileUploader label="PDF-dokument" accept=".pdf" currentUrl={cfg.pdfUrl} tavleId={tavleId} onUploaded={(url) => set("pdfUrl", url)} />
      <div className="space-y-1.5">
        <Label>Beskrivelse</Label>
        <Textarea rows={2} placeholder="Valgfri beskrivelse som vises under innholdet" value={cfg.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>
    </div>
  );
}

/* ─── Hoved-dialog ─── */
/* ─── Snarveier-konfigurasjon ─── */
const CUSTOM_COLORS = [
  { value: "blue",   label: "Blå",    cls: "bg-blue-500/20 hover:bg-blue-500/40 border-blue-500/40",     text: "text-blue-300" },
  { value: "green",  label: "Grønn",  cls: "bg-green-500/20 hover:bg-green-500/40 border-green-500/40",   text: "text-green-300" },
  { value: "red",    label: "Rød",    cls: "bg-red-500/20 hover:bg-red-500/40 border-red-500/40",         text: "text-red-300" },
  { value: "orange", label: "Oransje",cls: "bg-orange-500/20 hover:bg-orange-500/40 border-orange-500/40",text: "text-orange-300" },
  { value: "purple", label: "Lilla",  cls: "bg-purple-500/20 hover:bg-purple-500/40 border-purple-500/40",text: "text-purple-300" },
  { value: "yellow", label: "Gul",    cls: "bg-yellow-500/20 hover:bg-yellow-500/40 border-yellow-500/40",text: "text-yellow-300" },
  { value: "slate",  label: "Grå",    cls: "bg-slate-500/20 hover:bg-slate-500/40 border-slate-500/40",   text: "text-slate-300" },
];

interface CustomSnarvei {
  id: string;
  label: string;
  url: string;
  color: string; // value fra CUSTOM_COLORS
  emoji?: string;
}

function SnarveierConfig({ cfg, set, isAddon }: { cfg: any; set: (k: string, v: any) => void; isAddon: boolean }) {
  const saved: SnarveiConfig[] = cfg.shortcuts && cfg.shortcuts.length > 0
    ? cfg.shortcuts
    : DEFAULT_SNARVEIER_CONFIG;

  const custom: CustomSnarvei[] = cfg.customShortcuts ?? [];

  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [newEmoji, setNewEmoji] = useState("");

  function updateShortcut(id: string, field: keyof SnarveiConfig, value: any) {
    const updated = saved.map((s) => s.id === id ? { ...s, [field]: value } : s);
    set("shortcuts", updated);
  }

  function addCustom() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const entry: CustomSnarvei = {
      id: `custom_${Date.now()}`,
      label: newLabel.trim(),
      url: newUrl.trim(),
      color: newColor,
      emoji: newEmoji.trim() || undefined,
    };
    set("customShortcuts", [...custom, entry]);
    setNewLabel(""); setNewUrl(""); setNewEmoji(""); setNewColor("blue");
  }

  function removeCustom(id: string) {
    set("customShortcuts", custom.filter((c) => c.id !== id));
  }

  function updateCustom(id: string, field: keyof CustomSnarvei, value: string) {
    set("customShortcuts", custom.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  const visibleCount = saved.filter((s) => s.isVisible).length;

  return (
    <div className="space-y-5">
      {isAddon && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          <strong>HMS Nova:</strong> Knapper uten ekstern URL åpner direkte i HMS Nova.
        </div>
      )}
      {!isAddon && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Lim inn URL til ditt HMS-system for hver funksjon.
        </div>
      )}

      {/* Forhåndsdefinerte snarveier */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Standard funksjoner — {visibleCount} av {saved.length} aktive
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {ALLE_SNARVEIER.map((def) => {
            const shortcut = saved.find((s) => s.id === def.id) ?? { id: def.id, isVisible: false, externalUrl: "", customLabel: "" };
            return (
              <div key={def.id} className={`rounded-lg border p-3 transition-colors ${shortcut.isVisible ? "bg-muted/40 border-border" : "bg-muted/10 border-dashed border-muted"}`}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateShortcut(def.id, "isVisible", !shortcut.isVisible)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${shortcut.isVisible ? "bg-green-500" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${shortcut.isVisible ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{def.label}</span>
                      {def.lovRef && <span className="text-[10px] text-muted-foreground border rounded px-1">{def.lovRef}</span>}
                      {isAddon && !shortcut.externalUrl && <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1">HMS Nova</span>}
                    </div>
                    {shortcut.isVisible && (
                      <div className="mt-2 space-y-1.5">
                        <Input
                          placeholder={isAddon ? "Ekstern URL (valgfritt — overstyrer HMS Nova)" : "URL til ditt HMS-system"}
                          value={shortcut.externalUrl ?? ""}
                          onChange={(e) => updateShortcut(def.id, "externalUrl", e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder={`Egendefinert navn (standard: "${def.label}")`}
                          value={shortcut.customLabel ?? ""}
                          onChange={(e) => updateShortcut(def.id, "customLabel", e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Egne snarveier */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Egne snarveier
        </p>

        {custom.length > 0 && (
          <div className="space-y-2 mb-3">
            {custom.map((c) => (
              <div key={c.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.emoji || "🔗"}</span>
                  <span className="font-medium text-sm flex-1">{c.label}</span>
                  <button type="button" onClick={() => removeCustom(c.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input value={c.label} onChange={(e) => updateCustom(c.id, "label", e.target.value)} placeholder="Navn" className="h-7 text-xs" />
                  <Input value={c.emoji ?? ""} onChange={(e) => updateCustom(c.id, "emoji", e.target.value)} placeholder="Emoji (f.eks. 📋)" className="h-7 text-xs" />
                  <Input value={c.url} onChange={(e) => updateCustom(c.id, "url", e.target.value)} placeholder="https://..." className="h-7 text-xs col-span-2" />
                  <Select value={c.color} onValueChange={(v) => updateCustom(c.id, "color", v)}>
                    <SelectTrigger className="h-7 text-xs col-span-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CUSTOM_COLORS.map((col) => <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legg til ny */}
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2 bg-muted/10">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Legg til egen snarvei</p>
          <div className="grid grid-cols-2 gap-1.5">
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Navn (f.eks. Timeregistrering)" className="h-7 text-xs" />
            <Input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="Emoji (f.eks. ⏱️)" className="h-7 text-xs" />
            <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://ditt-system.no/..." className="h-7 text-xs col-span-2" />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CUSTOM_COLORS.map((col) => <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" onClick={addCustom} disabled={!newLabel.trim() || !newUrl.trim()} className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Legg til
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Gjesteskjema konfig (reiseliv) ─── */
function GjestSkjemaConfig({ cfg, set }: { cfg: any; set: (k: string, v: any) => void }) {
  const activeTypes: GuestType[] = Array.isArray(cfg.activeTypes)
    ? cfg.activeTypes
    : GUEST_TYPE_VALUES;
  const nb = getGuestDictionary("nb");

  function toggleType(type: GuestType) {
    const next = activeTypes.includes(type)
      ? activeTypes.filter((t) => t !== type)
      : [...activeTypes, type];
    set("activeTypes", next.length > 0 ? next : [type]);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Velkomsttekst (norsk)</Label>
        <Textarea
          rows={2}
          placeholder="Vi ønsker å gjøre oppholdet ditt best mulig..."
          value={cfg.welcomeText ?? ""}
          onChange={(e) => set("welcomeText", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Velkomsttekst (engelsk)</Label>
        <Textarea
          rows={2}
          placeholder="We want your stay to be as good as possible..."
          value={cfg.welcomeTextEn ?? ""}
          onChange={(e) => set("welcomeTextEn", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Meldingstyper gjesten kan velge</Label>
        <div className="space-y-1.5">
          {GUEST_TYPE_VALUES.map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeTypes.includes(type)}
                onChange={() => toggleType(type)}
                className="rounded border-gray-300"
              />
              <span>
                {GUEST_TYPE_EMOJI[type]} {nb.types[type].label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.showRoomField === true}
            onChange={(e) => set("showRoomField", e.target.checked)}
            className="rounded border-gray-300"
          />
          <span>Spør om rom- eller bordnummer</span>
        </label>
        {cfg.showRoomField === true && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Feltnavn (norsk)</Label>
              <Input
                placeholder="Romnummer"
                value={cfg.roomLabel ?? ""}
                onChange={(e) => set("roomLabel", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Feltnavn (engelsk)</Label>
              <Input
                placeholder="Room number"
                value={cfg.roomLabelEn ?? ""}
                onChange={(e) => set("roomLabelEn", e.target.value)}
              />
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={cfg.allowAttachments !== false}
            onChange={(e) => set("allowAttachments", e.target.checked)}
            className="rounded border-gray-300"
          />
          <span>Tillat at gjesten legger ved bilder</span>
        </label>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div>
          <Label>Serviceløfte – svarfrist i minutter</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Saker som ikke er påbegynt innen frist eskaleres til ledelsen.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Kritisk</Label>
            <Input
              type="number"
              min={5}
              placeholder="60"
              value={cfg.slaKritiskMinutes ?? ""}
              onChange={(e) => set("slaKritiskMinutes", Number(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Høy</Label>
            <Input
              type="number"
              min={5}
              placeholder="240"
              value={cfg.slaHoyMinutes ?? ""}
              onChange={(e) => set("slaHoyMinutes", Number(e.target.value) || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Normal</Label>
            <Input
              type="number"
              min={5}
              placeholder="1440"
              value={cfg.slaNormalMinutes ?? ""}
              onChange={(e) => set("slaNormalMinutes", Number(e.target.value) || undefined)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="space-y-1.5">
          <Label>Varsle på e-post (komma-separert)</Label>
          <Input
            placeholder="resepsjon@hotell.no, drift@hotell.no"
            value={(cfg.notifyEmails ?? []).join(", ")}
            onChange={(e) =>
              set(
                "notifyEmails",
                e.target.value
                  .split(",")
                  .map((v: string) => v.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>SMS ved kritiske saker (komma-separert)</Label>
          <Input
            placeholder="+4791234567"
            value={(cfg.notifySmsNumbers ?? []).join(", ")}
            onChange={(e) =>
              set(
                "notifySmsNumbers",
                e.target.value
                  .split(",")
                  .map((v: string) => v.trim())
                  .filter(Boolean)
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Brukes kun ved matforgiftning og andre kritiske saker.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground border-t pt-4">
        Innholdet i gjestmeldinger vises aldri på den offentlige tavlen. Gjesten får en privat
        sporingslenke og ser kun sin egen sak.
      </p>
    </div>
  );
}

/* ─── Tillitspanel konfig (anonymiserte tall) ─── */
function GjesteserviceStatusConfig({ cfg, set }: { cfg: any; set: (k: string, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Serviceløfte (norsk)</Label>
        <Textarea
          rows={2}
          placeholder="Vi svarer på alle tilbakemeldinger innen 24 timer."
          value={cfg.servicePromise ?? ""}
          onChange={(e) => set("servicePromise", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Serviceløfte (engelsk)</Label>
        <Textarea
          rows={2}
          placeholder="We respond to all feedback within 24 hours."
          value={cfg.servicePromiseEn ?? ""}
          onChange={(e) => set("servicePromiseEn", e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground border-t pt-4">
        Panelet viser kun anonymiserte tall: antall tilbakemeldinger, andel løst og median svartid
        siste 30 dager. Saksinnhold, navn og romnummer vises aldri. Tallene skjules automatisk når
        det er færre enn {TRUST_PANEL_MIN_VOLUME} saker.
      </p>
    </div>
  );
}

const SECTION_TITLES: Partial<Record<HmsTavleSectionType, string>> = {
  SNARVEIER: "Hurtigtilganger",
  GJEST_SKJEMA: "Gjesteskjema og serviceløfte",
  GJESTESERVICE_STATUS: "Tillitspanel for gjesteservice",
  SHA_PLAN: "Rediger SHA-plan",
  BEREDSKAPSPLAN: "Rediger beredskapsplan",
  AVVIK_STATISTIKK: "Rediger avviksstatistikk",
  KONTAKTINFO: "Rediger kontaktpersoner",
  NYHETER_MELDINGER: "Rediger meldinger",
  FREMDRIFTSPLAN: "Rediger fremdriftsplan",
  RIGGPLAN: "Last opp riggplan",
  RISIKOMATRISE: "Rediger risikomatrise",
  DOKUMENT_HUB: "Rediger dokumenthub",
  VAERMELDING: "Rediger værvarsling",
};

export function TavleSectionConfigDialog({ open, onClose, type, config, isAddon, tavleId, onSave }: Props) {
  const [cfg, setCfg] = useState<Record<string, any>>(config ?? {});

  function set(key: string, value: any) {
    setCfg((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(cfg);
    onClose();
  }

  const title = SECTION_TITLES[type] ?? `Rediger ${type}`;

  const editor = (() => {
    switch (type) {
      case "SHA_PLAN":
        return <ShaPlanConfig cfg={cfg} set={set} tavleId={tavleId} isAddon={isAddon} />;
      case "BEREDSKAPSPLAN":
        return <BeredskapsConfig cfg={cfg} set={set} tavleId={tavleId} />;
      case "AVVIK_STATISTIKK":
      case "RUH_LISTE":
        return <AvvikConfig cfg={cfg} set={set} isAddon={isAddon} />;
      case "KPI_DASHBOARD":
        return (
          <TallConfig
            cfg={cfg}
            set={set}
            isAddon={isAddon}
            hjelpetekst="Nøkkeltallene vises som store tall på tavlen. Oppdater dem når du ønsker."
            felter={[
              { key: "openIncidents", label: "Åpne avvik" },
              { key: "criticalIncidents", label: "Kritiske" },
              { key: "openMeasures", label: "Åpne tiltak" },
              { key: "daysSinceLastIncident", label: "Dager siden hendelse" },
            ]}
          />
        );
      case "OPPLARING_STATUS":
        return (
          <TallConfig
            cfg={cfg}
            set={set}
            isAddon={isAddon}
            hjelpetekst="Opplæring skal dokumenteres etter arbeidsmiljøloven § 3-2."
            felter={[
              { key: "valid", label: "Gyldige bevis" },
              { key: "expiringSoon", label: "Utløper snart" },
              { key: "expired", label: "Utløpt" },
            ]}
          />
        );
      case "VERNERUNDE_STATUS":
        return <VernerundeConfig cfg={cfg} set={set} isAddon={isAddon} />;
      case "SJA_AKTIVE":
        return <SjaConfig cfg={cfg} set={set} isAddon={isAddon} />;
      case "HMS_PLAN_AARSHJUL":
        return <AarshjulConfig cfg={cfg} set={set} isAddon={isAddon} />;
      case "KONTAKTINFO":
        return <KontaktConfig cfg={cfg} set={set} />;
      case "NYHETER_MELDINGER":
        return <NyheterConfig cfg={cfg} set={set} />;
      case "FREMDRIFTSPLAN":
        return <FremdriftsplanConfig cfg={cfg} set={set} tavleId={tavleId} />;
      case "RIGGPLAN":
        return <RiggplanConfig cfg={cfg} set={set} tavleId={tavleId} />;
      case "RISIKOMATRISE":
      case "DOKUMENT_HUB":
        return <GenericMediaConfig cfg={cfg} set={set} tavleId={tavleId} />;
      case "SNARVEIER":
        return <SnarveierConfig cfg={cfg} set={set} isAddon={isAddon} />;
      case "GJEST_SKJEMA":
        return <GjestSkjemaConfig cfg={cfg} set={set} />;
      case "GJESTESERVICE_STATUS":
        return <GjesteserviceStatusConfig cfg={cfg} set={set} />;
      case "VAERMELDING":
        return (
          <div className="space-y-2">
            <Label>Sted for værvarsling</Label>
            <Input placeholder="f.eks. Oslo, Lilleaker" value={cfg.location ?? ""} onChange={(e) => set("location", e.target.value)} />
            <p className="text-xs text-muted-foreground">Søkes opp på Yr.no. Legg til stedet for mer presis værvarsling.</p>
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground">Ingen innstillinger tilgjengelig for denne seksjonen.</p>;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">{editor}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave}>Lagre innhold</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
