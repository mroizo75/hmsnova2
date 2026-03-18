"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRiskAssessment } from "@/server/actions/risk.actions";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface RiskAssessmentFormProps {
  tenantId: string;
  defaultYear: number;
  projects: Array<{ id: string; name: string }>;
}

const NO_PROJECT_VALUE = "__none_project__";
const AI_RISK_TYPE_OPTIONS = [
  "Arbeid i høyden",
  "Maskiner og utstyr",
  "Kjemikalier og eksponering",
  "Ergonomi og belastning",
  "Brann og eksplosjon",
  "Alenearbeid",
  "Trafikk og kjøretøy",
  "Støy og vibrasjoner",
  "Vold og trusler",
  "Psykososial belastning",
] as const;

export function RiskAssessmentForm({ tenantId, defaultYear, projects }: RiskAssessmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(`Risikovurdering ${defaultYear}`);
  const [year, setYear] = useState(defaultYear);
  const [participants, setParticipants] = useState("");
  const [projectId, setProjectId] = useState<string>(NO_PROJECT_VALUE);
  const [aiRiskType, setAiRiskType] = useState<string>(AI_RISK_TYPE_OPTIONS[0]);
  const [industryContext, setIndustryContext] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createRiskAssessment({
        tenantId,
        projectId: projectId === NO_PROJECT_VALUE ? null : projectId,
        title: title.trim(),
        assessmentYear: year,
        participants: participants.trim() || undefined,
      });
      if (result.success && result.data) {
        toast({
          title: "Risikovurdering opprettet",
          description: `Du kan nå legge inn risikopunkter for ${year}.`,
          className: "bg-green-50 border-green-200",
        });
        const query = new URLSearchParams({
          openAi: "1",
          aiRiskType,
        });
        if (industryContext.trim()) {
          query.set("industryContext", industryContext.trim());
        }
        router.push(`/dashboard/risks/assessment/${result.data.id}?${query.toString()}`);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Feil", description: result.error ?? "Kunne ikke opprette" });
      }
    } catch {
      toast({ variant: "destructive", title: "Feil", description: "Noe gikk galt" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Risikovurdering for et år</CardTitle>
          <CardDescription>
            Tittel og år for den årlige risikovurderingen (IK-HMS § 5 nr. 6). Etter opprettelse legger du inn risikopunkter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Risikovurdering 2026"
                required
                minLength={3}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">År *</Label>
              <Input
                id="year"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || defaultYear)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prosjekt (valgfritt)</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Velg prosjekt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT_VALUE}>Ikke knyttet til prosjekt</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="participants">
              Deltakere i vurderingen
              <span className="ml-1 text-xs font-normal text-muted-foreground">(IK-HMS § 5 nr. 3 + AML § 3-1)</span>
            </Label>
            <Textarea
              id="participants"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="F.eks: Kari Olsen (HMS-ansvarlig), Per Hansen (Verneombud), Anne Berg (Avd.leder produksjon)"
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Loven krever at risikovurderingen gjøres i samarbeid med arbeidstakerne og verneombudet. Dokumenter hvem som deltok.
            </p>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">AI-forslag etter opprettelse</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Når du trykker opprett, åpnes neste steg med AI-forslag for valgt risikotype.
            </p>
            <div className="space-y-2">
              <Label>Velg risikotype</Label>
              <Select value={aiRiskType} onValueChange={setAiRiskType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg risikotype" />
                </SelectTrigger>
                <SelectContent>
                  {AI_RISK_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry-context">Underbransje / arbeidstype (valgfritt)</Label>
              <Input
                id="industry-context"
                value={industryContext}
                onChange={(e) => setIndustryContext(e.target.value)}
                placeholder="F.eks. terminaldrift, distribusjon, kjøletransport"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Oppretter..." : "Opprett risikovurdering"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
