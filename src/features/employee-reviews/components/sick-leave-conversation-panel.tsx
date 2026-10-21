"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { updateEmployeeReview } from "@/server/actions/employee-review.actions";
import {
  getSickLeaveTemplate,
  parseTemplateAnswers,
} from "@/features/employee-reviews/lib/sick-leave-templates";

interface SickLeaveConversationPanelProps {
  reviewId: string;
  templateKey: string | null;
  answers: unknown;
  canEdit: boolean;
}

export function SickLeaveConversationPanel({
  reviewId,
  templateKey,
  answers,
  canEdit,
}: SickLeaveConversationPanelProps) {
  const template = getSickLeaveTemplate(templateKey);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() => parseTemplateAnswers(answers));

  if (!template) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Malen for denne sykefraværssamtalen finnes ikke lenger.
        </CardContent>
      </Card>
    );
  }

  function save() {
    startTransition(async () => {
      const result = await updateEmployeeReview(reviewId, { templateAnswers: values });
      if (result.success) {
        toast({ title: "Sykefraværssamtalen er lagret" });
        return;
      }
      toast({ title: "Feil", description: result.error, variant: "destructive" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{template.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {template.legalRef}. {template.summary}
        </p>
        <p className="text-sm text-muted-foreground">Frist: {template.deadline}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {template.questions.map((question) => (
          <div key={question.id} className="space-y-2">
            <Label htmlFor={question.id}>
              {question.label}
              {question.required ? " *" : ""}
            </Label>
            <Textarea
              id={question.id}
              value={values[question.id] ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, [question.id]: event.target.value }))
              }
              rows={3}
              disabled={!canEdit}
              placeholder={question.help}
            />
            <p className="text-xs text-muted-foreground">{question.help}</p>
          </div>
        ))}
        {canEdit && (
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Lagre samtale
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
