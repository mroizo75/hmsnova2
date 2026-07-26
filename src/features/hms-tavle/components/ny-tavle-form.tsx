"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { HmsTavlePlan } from "@prisma/client";
import { PLAN_LABELS } from "@/features/hms-tavle/lib/tavle-plan-limits";
import { BRANSJE_OPTIONS } from "@/features/hms-tavle/lib/bransje-config";

interface Props {
  projects: { id: string; name: string; location: string | null }[];
  plan: HmsTavlePlan;
}

export function NyTavleForm({ projects, plan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    projectId: "",
    brandColor: "#2563eb",
    bransje: "BYGG_ANLEGG",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Navn er påkrevd");

    setLoading(true);
    try {
      const res = await fetch("/api/hms-tavle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          projectId: form.projectId || undefined,
          brandColor: form.brandColor,
          bransje: form.bransje,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil ved opprettelse");
      toast.success("Tavle opprettet!");
      router.push(`/dashboard/hms-tavle/${json.data.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bransje">Bransje *</Label>
            <Select value={form.bransje} onValueChange={(v) => setForm({ ...form, bransje: v })}>
              <SelectTrigger id="bransje">
                <SelectValue placeholder="Velg bransje" />
              </SelectTrigger>
              <SelectContent>
                {BRANSJE_OPTIONS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.emoji} {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Bransjeval tilpasser seksjonstekster og lovkrav-referanser på tavlen.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Navn på tavle *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="f.eks. Lagerhall B – Oslo, eller Blokkveien 12 – Nybygg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Kort beskrivelse av prosjektet..."
              rows={2}
            />
          </div>

          {projects.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="project">Koble til HMS Nova-prosjekt</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm({ ...form, projectId: v })}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Velg prosjekt (valgfritt)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.location ? ` – ${p.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kobling til prosjekt aktiverer live-data fra SHA-plan, mannskapsliste og avvik.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="color">Aksentfarge</Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={form.brandColor}
                onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                className="h-10 w-16 rounded border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">{form.brandColor}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Avbryt
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Oppretter..." : "Opprett tavle"}
        </Button>
      </div>
    </form>
  );
}
