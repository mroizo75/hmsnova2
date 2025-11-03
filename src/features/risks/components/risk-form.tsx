"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createRisk, updateRisk } from "@/server/actions/risk.actions";
import { RiskMatrix } from "./risk-matrix";
import { calculateRiskScore } from "@/features/risks/schemas/risk.schema";
import { useToast } from "@/hooks/use-toast";
import type { Risk } from "@prisma/client";

interface RiskFormProps {
  tenantId: string;
  userId: string;
  risk?: Risk;
  mode?: "create" | "edit";
}

const statusOptions = [
  { value: "OPEN", label: "Åpen" },
  { value: "MITIGATING", label: "Under håndtering" },
  { value: "ACCEPTED", label: "Akseptert" },
  { value: "CLOSED", label: "Lukket" },
];

export function RiskForm({ tenantId, userId, risk, mode = "create" }: RiskFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [likelihood, setLikelihood] = useState(risk?.likelihood || 3);
  const [consequence, setConsequence] = useState(risk?.consequence || 3);

  const { score, level, color, bgColor } = calculateRiskScore(likelihood, consequence);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      context: formData.get("context") as string,
      likelihood,
      consequence,
      ownerId: userId,
      status: formData.get("status") as string || "OPEN",
    };

    try {
      const result = mode === "create"
        ? await createRisk({ ...data, tenantId })
        : await updateRisk({ ...data, id: risk!.id });

      if (result.success) {
        toast({
          title: mode === "create" ? "✅ Risiko opprettet" : "✅ Risiko oppdatert",
          description: `Risikonivå: ${level} (${score})`,
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/risks");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lagre risiko",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Grunnleggende informasjon</CardTitle>
          <CardDescription>Beskriv risikoen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. Fall fra høyde ved arbeid på tak"
              defaultValue={risk?.title}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Beskrivelse *</Label>
            <Textarea
              id="context"
              name="context"
              placeholder="Beskriv situasjonen, hvor det kan skje, hvem som er utsatt, etc."
              defaultValue={risk?.context}
              required
              disabled={loading}
              rows={4}
            />
          </div>

          {mode === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={risk?.status || "OPEN"} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <RiskMatrix
        selectedLikelihood={likelihood}
        selectedConsequence={consequence}
        onCellClick={(l, c) => {
          setLikelihood(l);
          setConsequence(c);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Beregnet risikonivå</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-6 rounded-lg border-2 ${bgColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${color}`}>{level}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Sannsynlighet: {likelihood} × Konsekvens: {consequence}
                </div>
              </div>
              <div className={`text-6xl font-bold ${color}`}>{score}</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              {score >= 20 && "⚠️ Kritisk risiko - Må håndteres umiddelbart!"}
              {score >= 12 && score < 20 && "⚠️ Høy risiko - Krever tiltak snarest"}
              {score >= 6 && score < 12 && "⚠️ Moderat risiko - Planlegg tiltak"}
              {score < 6 && "✅ Lav risiko - Kan aksepteres med normal kontroll"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : mode === "create" ? "Opprett risiko" : "Lagre endringer"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}

