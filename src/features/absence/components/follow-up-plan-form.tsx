"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdateFollowUpPlanSchema, type UpdateFollowUpPlanInput } from "@/features/absence/schemas/follow-up.schema";
import { updateFollowUpPlan } from "@/server/actions/absence.actions";

interface FollowUpPlanFormProps {
  followUpId: string;
  absenceId: string;
  initialData?: {
    workAssessment?: string | null;
    accommodations?: string | null;
    externalSupport?: string | null;
    planSentToDoctor?: boolean;
    planSentAt?: string | null;
    notes?: string | null;
  };
}

export function FollowUpPlanForm({ followUpId, absenceId, initialData }: FollowUpPlanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UpdateFollowUpPlanInput>({
    resolver: zodResolver(UpdateFollowUpPlanSchema),
    defaultValues: {
      id: followUpId,
      workAssessment: initialData?.workAssessment ?? "",
      accommodations: initialData?.accommodations ?? "",
      externalSupport: initialData?.externalSupport ?? "",
      planSentToDoctor: initialData?.planSentToDoctor ?? false,
      planSentAt: initialData?.planSentAt ?? "",
      notes: initialData?.notes ?? "",
    },
  });

  const planSentToDoctor = watch("planSentToDoctor");

  async function onSubmit(data: UpdateFollowUpPlanInput) {
    setLoading(true);
    setError(null);
    const result = await updateFollowUpPlan(data);
    setLoading(false);
    if (result.success) {
      router.push(`/dashboard/fravaer/${absenceId}`);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register("id")} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oppfølgingsplan (AML § 4-6 (3))</CardTitle>
          <p className="text-sm text-muted-foreground">
            Arbeidsgiver skal i samråd med arbeidstaker utarbeide oppfølgingsplan innen fire uker.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workAssessment">Vurdering av arbeidsoppgaver og arbeidsevne *</Label>
            <Textarea
              id="workAssessment"
              {...register("workAssessment")}
              placeholder="Beskriv vurdering av hvilke arbeidsoppgaver som kan utføres..."
              rows={4}
            />
            {errors.workAssessment && (
              <p className="text-sm text-destructive mt-1">{errors.workAssessment.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="accommodations">Tilretteleggingstiltak *</Label>
            <Textarea
              id="accommodations"
              {...register("accommodations")}
              placeholder="Beskriv hvilke tilretteleggingstiltak som iverksettes..."
              rows={4}
            />
            {errors.accommodations && (
              <p className="text-sm text-destructive mt-1">{errors.accommodations.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="externalSupport">Bistand fra BHT/NAV</Label>
            <Textarea
              id="externalSupport"
              {...register("externalSupport")}
              placeholder="Ev. behov for bistand fra bedriftshelsetjeneste eller NAV..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="planSentToDoctor"
              checked={planSentToDoctor}
              onCheckedChange={(checked) => setValue("planSentToDoctor", checked === true)}
            />
            <Label htmlFor="planSentToDoctor" className="text-sm font-normal">
              Oppfølgingsplanen er sendt til sykmelder
            </Label>
          </div>

          {planSentToDoctor && (
            <div>
              <Label htmlFor="planSentAt">Dato sendt til sykmelder</Label>
              <Input
                id="planSentAt"
                type="date"
                {...register("planSentAt")}
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notater</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Eventulle notater..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Lagrer..." : "Fullfør oppfølgingsplan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/dashboard/fravaer/${absenceId}`)}
        >
          Avbryt
        </Button>
      </div>
    </form>
  );
}
