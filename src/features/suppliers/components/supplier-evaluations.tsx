"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPLIER_EVALUATION_METHOD_LABELS,
  SUPPLIER_EVALUATION_OUTCOME_LABELS,
  SUPPLIER_EVALUATION_OUTCOMES,
  SUPPLIER_MANUAL_METHODS,
  type SupplierEvaluationMethodValue,
  type SupplierEvaluationOutcomeValue,
} from "@/lib/supplier-management";
import { recordSupplierEvaluation } from "@/server/actions/supplier.actions";

export interface SupplierEvaluationView {
  id: string;
  method: SupplierEvaluationMethodValue;
  outcome: SupplierEvaluationOutcomeValue;
  summary: string;
  actions: string | null;
  evaluatedAt: string;
  nextReviewAt: string | null;
  evaluatedByName: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

export function SupplierEvaluations({
  supplierId,
  currentNextReviewAt,
  evaluations,
}: {
  supplierId: string;
  currentNextReviewAt: string | null;
  evaluations: SupplierEvaluationView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await recordSupplierEvaluation(supplierId, formData);
      if (!result.success) {
        setError(result.error);
        toast({ variant: "destructive", title: "Kunne ikke lagre", description: result.error });
        return;
      }
      form.reset();
      toast({ title: "Vurderingen er lagret" });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Gjeldende re-evaluering: {currentNextReviewAt ? formatDate(currentNextReviewAt) : "ikke satt"}. Datoen settes her når vurderingen lagres, og det er denne listen og varslene bruker.
      </p>
      {evaluations.length === 0 ? <p className="text-sm text-muted-foreground">Ingen vurderinger er registrert. Leverandøren står som Til vurdering til den første vurderingen er lagret.</p> : null}
      <div className="space-y-3">
        {evaluations.map((evaluation) => (
          <div key={evaluation.id} className="rounded-md border p-4 text-sm">
            <p className="font-medium">
              {SUPPLIER_EVALUATION_METHOD_LABELS[evaluation.method]} · {SUPPLIER_EVALUATION_OUTCOME_LABELS[evaluation.outcome]}
            </p>
            <p className="text-muted-foreground">
              {formatDate(evaluation.evaluatedAt)}
              {evaluation.evaluatedByName ? ` · ${evaluation.evaluatedByName}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{evaluation.summary}</p>
            {evaluation.actions ? <p className="mt-2 whitespace-pre-wrap">Tiltak: {evaluation.actions}</p> : null}
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Ny vurdering</p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="method">Metode</Label>
            <select id="method" name="method" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              {SUPPLIER_MANUAL_METHODS.map((method) => (
                <option key={method} value={method}>
                  {SUPPLIER_EVALUATION_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eval-outcome">Resultat</Label>
            <select id="eval-outcome" name="outcome" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              {SUPPLIER_EVALUATION_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {SUPPLIER_EVALUATION_OUTCOME_LABELS[outcome]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eval-next">Neste re-evaluering</Label>
            <Input id="eval-next" name="nextReviewAt" type="date" />
            <p className="text-xs text-muted-foreground">Dette blir leverandørens gjeldende dato, og status settes til resultatet over.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eval-summary">Hva er gjennomgått</Label>
          <Textarea id="eval-summary" name="summary" rows={4} required minLength={10} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eval-actions">Nødvendige tiltak</Label>
          <Textarea id="eval-actions" name="actions" rows={2} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Lagrer…" : "Lagre vurdering"}
        </Button>
      </form>
    </div>
  );
}
