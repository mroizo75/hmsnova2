"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, X, CheckCircle2 } from "lucide-react";
import type { AllergenOversikt } from "@prisma/client";

const EU_ALLERGENER = [
  { key: "hasGluten",    label: "Gluten" },
  { key: "hasKrepsdyr",  label: "Krepsdyr" },
  { key: "hasEgg",       label: "Egg" },
  { key: "hasFisk",      label: "Fisk" },
  { key: "hasPeanut",    label: "Peanøtter" },
  { key: "hasSoya",      label: "Soya" },
  { key: "hasMelk",      label: "Melk" },
  { key: "hasNotter",    label: "Nøtter" },
  { key: "hasSelleri",   label: "Selleri" },
  { key: "hasSennep",    label: "Sennep" },
  { key: "hasSesamfro",  label: "Sesamfrø" },
  { key: "hasSulfitt",   label: "Sulfitt" },
  { key: "hasLupin",     label: "Lupin" },
  { key: "hasBlotkdyr",  label: "Bløtdyr" },
] as const;

type AllergenKey = typeof EU_ALLERGENER[number]["key"];

function initForm(): Omit<AllergenOversikt, "id" | "tenantId" | "createdAt" | "updatedAt" | "lastVerified"> {
  const bools = EU_ALLERGENER.reduce((acc, a) => ({ ...acc, [a.key]: false }), {} as Record<AllergenKey, boolean>);
  return { dishName: "", category: null, ...bools, additionalInfo: null, isActive: true };
}

interface Props { items: AllergenOversikt[]; categories: string[]; canEdit: boolean; }

export function AllergenClient({ items: initial, categories, canEdit }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<AllergenOversikt[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initForm());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("alle");

  const displayItems = filter === "alle" ? items : items.filter((i) => i.category === filter);
  const allCategories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];

  async function submit() {
    if (!form.dishName) { toast.error("Fyll inn retnavn"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ik-mat/allergener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setItems((p) => [...p, data.item]);
      toast.success("Rett lagt til");
      setShowForm(false);
      setForm(initForm());
    } catch { toast.error("Feil"); }
    finally { setSaving(false); }
  }

  function toggleAllergen(key: AllergenKey) {
    setForm((p) => ({ ...p, [key]: !(p as any)[key] }));
  }

  function allergenCount(item: AllergenOversikt) {
    return EU_ALLERGENER.filter((a) => (item as any)[a.key]).length;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Allergenoversikt</h1>
          <p className="text-sm text-muted-foreground mt-1">
            EU-forordning 1169/2011 – de 14 lovpålagte allergenene skal merkes og kommuniseres til gjester
          </p>
        </div>
        {canEdit && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1.5" />Legg til rett</Button>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Retter totalt</p><p className="font-bold text-xl">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Med allergener</p><p className="font-bold text-xl text-orange-600">{items.filter((i) => allergenCount(i) > 0).length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Kategorier</p><p className="font-bold text-xl">{allCategories.length}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Ny rett / produkt</p>
              <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rettens navn *</Label>
                <Input placeholder="f.eks. Laksepasta" value={form.dishName} onChange={(e) => setForm((p) => ({ ...p, dishName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategori</Label>
                <Input placeholder="f.eks. Hovedrett, Dessert" value={form.category ?? ""} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value || null }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Allergener som er tilstede (klikk for å merke)</Label>
              <div className="flex flex-wrap gap-1.5">
                {EU_ALLERGENER.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => toggleAllergen(a.key)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${(form as any)[a.key] ? "bg-orange-500 text-white border-orange-500" : "bg-background border-border hover:bg-muted"}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" disabled={saving} onClick={submit}>{saving ? "Lagrer..." : "Lagre"}</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {["alle", ...allCategories].map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${filter === c ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}>
            {c === "alle" ? "Alle" : c}
          </button>
        ))}
      </div>

      {displayItems.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">Ingen retter registrert ennå</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b">
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Rett</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Kategori</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Allergener</th>
              <th className="text-left p-2 font-medium text-xs text-muted-foreground">Antall</th>
            </tr></thead>
            <tbody>
              {displayItems.map((item) => {
                const presentAllergens = EU_ALLERGENER.filter((a) => (item as any)[a.key]);
                return (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-medium">{item.dishName}</td>
                    <td className="p-2 text-muted-foreground text-xs">{item.category ?? "–"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {presentAllergens.length === 0
                          ? <span className="text-xs text-green-600">Ingen</span>
                          : presentAllergens.map((a) => (
                            <span key={a.key} className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{a.label}</span>
                          ))}
                      </div>
                    </td>
                    <td className="p-2">
                      {presentAllergens.length > 0
                        ? <Badge variant="outline" className="text-orange-600 border-orange-200">{presentAllergens.length}</Badge>
                        : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
