"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { createProfile, updateProfile } from "@/server/actions/competence.actions";

interface CourseOption {
  courseKey: string;
  title: string;
}

interface Requirement {
  courseKey: string;
  requiredLevel: string;
  priority: number;
  legalRef?: string;
  notes?: string;
}

interface CompetenceProfileFormProps {
  courseTemplates: CourseOption[];
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    industry: string | null;
    requirements: { courseKey: string; requiredLevel: string; priority: number; legalRef: string | null; notes: string | null }[];
  };
}

export function CompetenceProfileForm({ courseTemplates, initialData }: CompetenceProfileFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [industry, setIndustry] = useState(initialData?.industry ?? "");
  const [requirements, setRequirements] = useState<Requirement[]>(
    initialData?.requirements.map((r) => ({
      courseKey: r.courseKey,
      requiredLevel: r.requiredLevel,
      priority: r.priority,
      legalRef: r.legalRef ?? "",
      notes: r.notes ?? "",
    })) ?? []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRequirement() {
    setRequirements([...requirements, { courseKey: "", requiredLevel: "REQUIRED", priority: 0, legalRef: "", notes: "" }]);
  }

  function removeRequirement(idx: number) {
    setRequirements(requirements.filter((_, i) => i !== idx));
  }

  function updateRequirement(idx: number, field: keyof Requirement, value: string | number) {
    setRequirements(requirements.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = {
      name,
      description: description || undefined,
      industry: (industry || undefined) as "generell" | "bygg" | "helse" | "transport" | undefined,
      requirements: requirements
        .filter((r) => r.courseKey)
        .map((r) => ({
          courseKey: r.courseKey,
          requiredLevel: r.requiredLevel as "REQUIRED" | "RECOMMENDED" | "AWARENESS",
          priority: r.priority,
          legalRef: r.legalRef || undefined,
          notes: r.notes || undefined,
        })),
    };

    const result = isEditing
      ? await updateProfile({ id: initialData!.id, ...data })
      : await createProfile(data);

    setSubmitting(false);

    if (result.success) {
      router.push("/dashboard/training/profiler");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  const usedKeys = new Set(requirements.map((r) => r.courseKey));

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{isEditing ? "Rediger profil" : "Ny kompetanseprofil"}</h1>
        <p className="text-muted-foreground mt-1">
          Definer kompetansekrav for en rolle eller stilling
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Generelt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Navn *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="industry">Bransje</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="industry">
                <SelectValue placeholder="Velg bransje (valgfritt)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generell">Generell</SelectItem>
                <SelectItem value="bygg">Bygg/anlegg</SelectItem>
                <SelectItem value="helse">Helse/omsorg</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Kompetansekrav</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRequirement}>
              <Plus className="h-4 w-4 mr-1" /> Legg til krav
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ingen krav lagt til ennå
            </p>
          ) : (
            <div className="space-y-4">
              {requirements.map((req, idx) => (
                <div key={idx} className="grid gap-3 sm:grid-cols-4 items-end border-b pb-4 last:border-b-0">
                  <div className="sm:col-span-2">
                    <Label>Kurs</Label>
                    <Select
                      value={req.courseKey}
                      onValueChange={(v) => updateRequirement(idx, "courseKey", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg kurs" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseTemplates.map((ct) => (
                          <SelectItem
                            key={ct.courseKey}
                            value={ct.courseKey}
                            disabled={usedKeys.has(ct.courseKey) && ct.courseKey !== req.courseKey}
                          >
                            {ct.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nivå</Label>
                    <Select
                      value={req.requiredLevel}
                      onValueChange={(v) => updateRequirement(idx, "requiredLevel", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REQUIRED">Påkrevd</SelectItem>
                        <SelectItem value="RECOMMENDED">Anbefalt</SelectItem>
                        <SelectItem value="AWARENESS">Kjennskap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Lovref.</Label>
                      <Input
                        placeholder="F.eks. AML § 3-5"
                        value={req.legalRef ?? ""}
                        onChange={(e) => updateRequirement(idx, "legalRef", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-end"
                      onClick={() => removeRequirement(idx)}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Lagrer..." : isEditing ? "Oppdater profil" : "Opprett profil"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
