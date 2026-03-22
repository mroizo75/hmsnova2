"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { closeIncident } from "@/server/actions/incident.actions";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface CloseIncidentFormProps {
  incidentId: string;
  userId: string;
}

export function CloseIncidentForm({ incidentId, userId }: CloseIncidentFormProps) {
  const t = useTranslations("dashboardIncidentCloseForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: incidentId,
      closedBy: userId,
      effectivenessReview: formData.get("effectivenessReview") as string,
      lessonsLearned: formData.get("lessonsLearned") as string || undefined,
      measureEffectiveness: formData.get("measureEffectiveness") as string,
    };

    try {
      const result = await closeIncident(data);

      if (result.success) {
        toast({
          title: t("toasts.success.title"),
          description: t("toasts.success.description"),
          className: "bg-green-50 border-green-200",
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: t("toasts.error.title"),
          description: result.error || t("toasts.error.description"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("toasts.unexpected.title"),
        description: t("toasts.unexpected.description"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
            <p className="text-sm font-medium text-green-900 mb-2">{t("ready.title")}</p>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>{t("ready.items.i1")}</li>
              <li>{t("ready.items.i2")}</li>
              <li>{t("ready.items.i3")}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectivenessReview">{t("fields.effectivenessReview")}</Label>
            <Textarea
              id="effectivenessReview"
              name="effectivenessReview"
              placeholder={t("placeholders.effectivenessReview")}
              required
              disabled={loading}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              {t("hints.effectivenessReview")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="measureEffectiveness">{t("fields.measureEffectiveness")}</Label>
            <Select
              name="measureEffectiveness"
              defaultValue="EFFECTIVE"
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.measureEffectiveness")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EFFECTIVE">{t("effectiveness.effective")}</SelectItem>
                <SelectItem value="PARTIALLY_EFFECTIVE">{t("effectiveness.partiallyEffective")}</SelectItem>
                <SelectItem value="INEFFECTIVE">{t("effectiveness.ineffective")}</SelectItem>
                <SelectItem value="NOT_EVALUATED">{t("effectiveness.notEvaluated")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsLearned">{t("fields.lessonsLearned")}</Label>
            <Textarea
              id="lessonsLearned"
              name="lessonsLearned"
              placeholder={t("placeholders.lessonsLearned")}
              disabled={loading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {t("hints.lessonsLearned")}
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">{t("compliance.title")}</p>
            <p className="text-sm text-blue-800">
              {t("compliance.description")}
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside ml-2">
              <li>{t("compliance.items.i1")}</li>
              <li>{t("compliance.items.i2")}</li>
              <li>{t("compliance.items.i3")}</li>
              <li>{t("compliance.items.i4")}</li>
            </ul>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? t("actions.closing") : t("actions.close")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

