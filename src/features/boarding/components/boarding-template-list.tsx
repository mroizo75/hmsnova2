"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { deleteTemplate, ensureDefaultTemplates } from "@/server/actions/boarding.actions";

interface Template {
  id: string;
  name: string;
  type: string;
  description: string | null;
  tasks: any[];
  _count: { boardings: number };
}

interface BoardingTemplateListProps {
  templates: Template[];
  canManage: boolean;
}

export function BoardingTemplateList({ templates, canManage }: BoardingTemplateListProps) {
  const [loading, setLoading] = useState(false);

  async function handleGenerateDefaults() {
    setLoading(true);
    await ensureDefaultTemplates();
    setLoading(false);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Er du sikker på at du vil slette denne malen?")) return;
    await deleteTemplate(id);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maler</h1>
          <p className="text-muted-foreground mt-1">
            Sjekkliste-maler for onboarding og offboarding
          </p>
        </div>
        {canManage && templates.length === 0 && (
          <Button onClick={handleGenerateDefaults} disabled={loading}>
            {loading ? "Oppretter..." : "Generer standardmaler"}
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Ingen maler funnet. Klikk &quot;Generer standardmaler&quot; for å komme i gang.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline">
                    {t.type === "ONBOARDING" ? "Onboarding" : "Offboarding"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {t.description && (
                  <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t.tasks.length} oppgaver · Brukt {t._count.boardings} ganger
                  </span>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/onboarding/maler/${t.id}`}>
                      <Button variant="outline" size="sm">Rediger</Button>
                    </Link>
                    {canManage && t._count.boardings === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
