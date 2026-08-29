"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ACTIVITY_QUESTIONS,
  ACTIVITY_CATEGORIES,
  getDefaultAnswers,
  deriveActiveActivities,
} from "@/lib/activity-questions";
import { saveActivityProfile } from "@/server/actions/regulatory.actions";
import { REGULATORY_REQUIREMENTS } from "@/lib/regulatory-requirements-seed";
import { Building2, ClipboardCheck, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type WizardProps = {
  tenant: {
    name: string | null;
    orgNumber: string | null;
    naceCode: string | null;
    naceDescription: string | null;
    industry: string | null;
  } | null;
  onComplete?: () => void;
};

export function RegulatoryWizard({ tenant, onComplete }: WizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>(
    getDefaultAnswers(tenant?.naceCode ?? null)
  );
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const router = useRouter();

  const markAllActivities = (value: boolean) => {
    const next: Record<string, boolean> = {};
    for (const q of ACTIVITY_QUESTIONS) {
      next[q.key] = value;
    }
    setAnswers(next);
  };

  const activeActivities = deriveActiveActivities(answers, tenant?.naceCode);

  const matchedRequirements = REGULATORY_REQUIREMENTS.filter((req) =>
    req.triggerActivities.some((t) => activeActivities.includes(t))
  );

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await saveActivityProfile({ answers });
      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["juridisk-register"] });
        router.refresh();
        onComplete?.();
      }
    });
  };

  const categories = Object.entries(ACTIVITY_CATEGORIES);
  const questionsByCategory = categories.map(([key, label]) => ({
    key,
    label,
    questions: ACTIVITY_QUESTIONS.filter((q) => q.category === key),
  })).filter((c) => c.questions.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        {[
          { icon: Building2, label: "Virksomhet" },
          { icon: ClipboardCheck, label: "Kontrollspørsmål" },
          { icon: CheckCircle2, label: "Oppsummering" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                i <= step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              <s.icon className="h-4 w-4" />
            </div>
            <span className={`text-sm font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < 2 && <div className="mx-2 h-px w-8 bg-muted-foreground/30" />}
          </div>
        ))}
      </div>

      {/* Step 1: Company info */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Virksomhetsinformasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vi bruker registrerte opplysninger om virksomheten din til å tilpasse regelverksprofilen.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoField label="Virksomhetsnavn" value={tenant?.name} />
              <InfoField label="Org.nr." value={tenant?.orgNumber} />
              <InfoField label="NACE-kode" value={tenant?.naceCode} />
              <InfoField label="Bransje" value={tenant?.naceDescription || tenant?.industry} />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(1)}>
                Neste
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Control questions */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Kontrollspørsmål</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Kryss av for aktiviteter som gjelder din virksomhet. Basert på NACE-kode er noen allerede foreslått.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => markAllActivities(true)}>
                  Merk alle
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => markAllActivities(false)}>
                  Fjern alle
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionsByCategory.map((cat) => (
              <div key={cat.key}>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {cat.label}
                </h3>
                <div className="space-y-2">
                  {cat.questions.map((q) => (
                    <div
                      key={q.key}
                      className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`activity-${q.key}`}
                        checked={answers[q.key] ?? false}
                        onCheckedChange={(checked) =>
                          setAnswers((prev) => ({ ...prev, [q.key]: checked === true }))
                        }
                        className="mt-0.5"
                      />
                      <label htmlFor={`activity-${q.key}`} className="cursor-pointer text-sm">
                        {q.text}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake
              </Button>
              <Button onClick={() => setStep(2)}>
                Neste
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Summary */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Oppsummering</CardTitle>
            <p className="text-sm text-muted-foreground">
              Basert på dine svar har vi identifisert {matchedRequirements.length} lovkrav som gjelder din virksomhet.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {matchedRequirements.map((req) => (
                <div key={req.title} className="flex items-start gap-3 rounded-md border p-3">
                  <Badge
                    variant={req.severity === "MANDATORY" ? "destructive" : "secondary"}
                    className="mt-0.5 shrink-0"
                  >
                    {req.severity === "MANDATORY" ? "Påkrevd" : "Anbefalt"}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{req.title}</p>
                    <p className="text-xs text-muted-foreground">{req.legalBasis}</p>
                  </div>
                </div>
              ))}
            </div>

            {matchedRequirements.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ingen krav matchet. Vennligst gå tilbake og kryss av relevante aktiviteter.
              </p>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tilbake
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || matchedRequirements.length === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Opprett profil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "Ikke registrert"}</p>
    </div>
  );
}
