"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  SUPPLIER_ASSESSMENT_STATUS_LABELS,
  SUPPLIER_EVALUATION_OUTCOMES,
  SUPPLIER_EVALUATION_OUTCOME_LABELS,
  type SupplierAssessmentStatusValue,
  type SupplierEvaluationOutcomeValue,
} from "@/lib/supplier-management";
import {
  resendSupplierAssessment,
  reviewSupplierAssessment,
  sendSupplierAssessment,
} from "@/server/actions/supplier-assessment.actions";

export interface SupplierAssessmentView {
  id: string;
  status: SupplierAssessmentStatusValue;
  dueAt: string;
  sentAt: string;
  sentToEmail: string;
  respondentName: string | null;
  respondentEmail: string | null;
  answers: { label: string; value: string }[];
  suggestedSummary: string;
}

function formatDate(value: string | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("nb-NO");
}

export function SupplierAssessments({
  supplierId,
  contactEmail,
  canSend,
  questionCount,
  assessments,
}: {
  supplierId: string;
  contactEmail: string;
  canSend: boolean;
  questionCount: number;
  assessments: SupplierAssessmentView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "resend" | "review" | null>(null);

  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setBusy("send");
    startTransition(async () => {
      const result = await sendSupplierAssessment(supplierId, formData);
      setBusy(null);
      if (!result.success) {
        setError(result.error);
        toast({ variant: "destructive", title: "Kunne ikke sende", description: result.error });
        if (result.error.includes("lagret")) router.refresh();
        return;
      }
      toast({ title: "Selvevaluering sendt" });
      router.refresh();
    });
  };

  const resend = (id: string) => {
    setBusy("resend");
    startTransition(async () => {
      const result = await resendSupplierAssessment(id);
      setBusy(null);
      if (!result.success) {
        toast({ variant: "destructive", title: "Kunne ikke sende", description: result.error });
        return;
      }
      toast({ title: "Påminnelse sendt" });
      router.refresh();
    });
  };

  const review = (id: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy("review");
    startTransition(async () => {
      const result = await reviewSupplierAssessment(id, formData);
      setBusy(null);
      if (!result.success) {
        toast({ variant: "destructive", title: "Kunne ikke behandle", description: result.error });
        return;
      }
      toast({ title: "Vurderingen er lagret" });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={send} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {questionCount === 0
            ? "Definer spørsmålene før skjemaet kan sendes."
            : contactEmail
              ? `Skjemaet med ${questionCount} spørsmål sendes til ${contactEmail}. Kravene og styringen som står på leverandøren, følger med.`
              : "Registrer e-post, krav og styring før skjemaet kan sendes."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="dueAt">Svarfrist</Label>
            <Input id="dueAt" name="dueAt" type="date" required />
          </div>
          <Button type="submit" disabled={pending || !canSend}>
            {busy === "send" ? "Sender…" : "Send selvevaluering"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/leverandorer/skjema">Rediger spørsmål</Link>
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>

      {assessments.length === 0 ? <p className="text-sm text-muted-foreground">Ingen selvevalueringer er sendt.</p> : null}

      {assessments.map((assessment) => (
        <div key={assessment.id} className="space-y-3 rounded-md border p-4 text-sm">
          <p>
            <span className="font-medium">{SUPPLIER_ASSESSMENT_STATUS_LABELS[assessment.status]}</span>
            <span className="text-muted-foreground">
              {" "}
              · sendt {formatDate(assessment.sentAt)} til {assessment.sentToEmail} · frist {formatDate(assessment.dueAt)}
            </span>
          </p>
          {assessment.status === "SENT" ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => resend(assessment.id)}>
              {busy === "resend" ? "Sender…" : "Send på nytt"}
            </Button>
          ) : null}
          {assessment.status === "ANSWERED" ? (
            <div className="space-y-3">
              <dl className="space-y-1 text-muted-foreground">
                <div>Svarer: {assessment.respondentName} ({assessment.respondentEmail})</div>
                {assessment.answers.map((answer) => (
                  <div key={answer.label}>
                    {answer.label}: {answer.value || "–"}
                  </div>
                ))}
              </dl>
              <form onSubmit={(event) => review(assessment.id, event)} className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`outcome-${assessment.id}`}>Resultat</Label>
                    <select
                      id={`outcome-${assessment.id}`}
                      name="outcome"
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      defaultValue="APPROVED"
                    >
                      {SUPPLIER_EVALUATION_OUTCOMES.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {SUPPLIER_EVALUATION_OUTCOME_LABELS[outcome as SupplierEvaluationOutcomeValue]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`next-${assessment.id}`}>Neste re-evaluering</Label>
                    <Input id={`next-${assessment.id}`} name="nextReviewAt" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`summary-${assessment.id}`}>Vurdering</Label>
                  <Textarea id={`summary-${assessment.id}`} name="summary" rows={5} defaultValue={assessment.suggestedSummary} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`actions-${assessment.id}`}>Nødvendige tiltak</Label>
                  <Textarea id={`actions-${assessment.id}`} name="actions" rows={2} />
                </div>
                <Button type="submit" disabled={pending}>
                  {busy === "review" ? "Lagrer…" : "Lagre vurdering"}
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
