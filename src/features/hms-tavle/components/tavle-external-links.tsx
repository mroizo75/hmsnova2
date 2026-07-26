"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, FileSpreadsheet, FileText, Globe, Share2 } from "lucide-react";
import { ExternalLinkType, HmsTavleExternalLink } from "@prisma/client";

const TYPE_OPTIONS: { value: ExternalLinkType; label: string; icon: React.ReactNode }[] = [
  { value: "EXCEL", label: "Excel-fil", icon: <FileSpreadsheet className="h-4 w-4 text-green-600" /> },
  { value: "PDF", label: "PDF-dokument", icon: <FileText className="h-4 w-4 text-red-600" /> },
  { value: "HMS_SYSTEM", label: "HMS-system (Synergi, EHS m.fl.)", icon: <Globe className="h-4 w-4 text-blue-600" /> },
  { value: "SHAREPOINT", label: "SharePoint / Teams", icon: <Share2 className="h-4 w-4 text-purple-600" /> },
  { value: "ANNET", label: "Annet", icon: <ExternalLink className="h-4 w-4 text-muted-foreground" /> },
];

interface Props {
  tavleId: string;
  links: HmsTavleExternalLink[];
  canManage: boolean;
}

export function TavleExternalLinks({ tavleId, links: initial, canManage }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", type: "ANNET" as ExternalLinkType });
  const [saving, setSaving] = useState(false);

  async function addLink() {
    if (!form.title.trim() || !form.url.trim()) return toast.error("Tittel og URL er påkrevd");
    setSaving(true);
    try {
      const res = await fetch(`/api/hms-tavle/${tavleId}/external-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil");
      setLinks((prev) => [...prev, json.data]);
      setForm({ title: "", url: "", type: "ANNET" });
      setAdding(false);
      toast.success("Lenke lagt til");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLink(id: string) {
    try {
      const res = await fetch(`/api/hms-tavle/external-links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Feil ved sletting");
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lenke slettet");
    } catch {
      toast.error("Kunne ikke slette lenke");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Eksterne systemlenker</h3>
          <p className="text-sm text-muted-foreground">
            Lenk inn Excel-filer, SharePoint, andre HMS-systemer og dokumenter.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAdding(!adding)}>
            <Plus className="h-4 w-4 mr-1" />
            Legg til lenke
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ny ekstern lenke</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tittel</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="f.eks. SHA-plan Excel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as ExternalLinkType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        <div className="flex items-center gap-2">
                          {o.icon}
                          {o.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL / lenke</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
                Avbryt
              </Button>
              <Button size="sm" onClick={addLink} disabled={saving}>
                {saving ? "Lagrer..." : "Legg til"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {links.length === 0 && !adding ? (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
          Ingen externe lenker ennå. Legg til Excel-filer, SharePoint eller andre systemer.
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const typeInfo = TYPE_OPTIONS.find((o) => o.value === link.type);
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
              >
                {typeInfo?.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{link.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                </div>
                <Button size="icon" variant="ghost" asChild>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteLink(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
