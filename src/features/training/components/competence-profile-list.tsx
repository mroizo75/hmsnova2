"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { deleteProfile, ensureDefaultProfiles } from "@/server/actions/competence.actions";

const INDUSTRY_LABELS: Record<string, string> = {
  generell: "Generell",
  bygg: "Bygg/anlegg",
  helse: "Helse/omsorg",
  transport: "Transport",
};

const LEVEL_LABELS: Record<string, string> = {
  REQUIRED: "Påkrevd",
  RECOMMENDED: "Anbefalt",
  AWARENESS: "Kjennskap",
};

interface Profile {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  isDefault: boolean;
  requirements: { id: string; courseKey: string; requiredLevel: string; legalRef: string | null }[];
  _count: { users: number };
}

interface CompetenceProfileListProps {
  profiles: Profile[];
  canCreate: boolean;
}

export function CompetenceProfileList({ profiles, canCreate }: CompetenceProfileListProps) {
  const [loading, setLoading] = useState(false);

  async function handleGenerateDefaults() {
    setLoading(true);
    await ensureDefaultProfiles();
    setLoading(false);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Er du sikker på at du vil slette denne profilen?")) return;
    await deleteProfile(id);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kompetanseprofiler</h1>
          <p className="text-muted-foreground mt-1">
            Definer hvilke kurs og sertifikater ulike roller krever (IK-HMS § 5 nr. 5)
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && profiles.length === 0 && (
            <Button variant="outline" onClick={handleGenerateDefaults} disabled={loading}>
              {loading ? "Oppretter..." : "Generer standardprofiler"}
            </Button>
          )}
          {canCreate && (
            <Link href="/dashboard/training/profiler/ny">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ny profil
              </Button>
            </Link>
          )}
        </div>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Ingen profiler funnet. Klikk &quot;Generer standardprofiler&quot; for å komme i gang.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profiles.map((p) => {
            const requiredCount = p.requirements.filter((r) => r.requiredLevel === "REQUIRED").length;
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.industry && (
                      <Badge variant="outline">
                        {INDUSTRY_LABELS[p.industry] ?? p.industry}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span>{p.requirements.length} krav ({requiredCount} påkrevd)</span>
                      <span>{p._count.users} ansatte</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/training/profiler/${p.id}`}>
                        <Button variant="outline" size="sm">Vis</Button>
                      </Link>
                      {canCreate && p._count.users === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
