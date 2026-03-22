"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface CompleteInspectionButtonProps {
  inspectionId: string;
  findingsCount: number;
}

export function CompleteInspectionButton({
  inspectionId,
  findingsCount,
}: CompleteInspectionButtonProps) {
  const t = useTranslations("dashboardInspectionComponents.completeButton");
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const completeInspection = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          completedDate: new Date().toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || t("errors.complete"));
      }

      toast({
        title: findingsCount > 0 ? t("toasts.completedWithFindings.title") : t("toasts.completedWithoutFindings.title"),
        description:
          findingsCount > 0
            ? t("toasts.completedWithFindings.description")
            : t("toasts.completedWithoutFindings.description"),
      });
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: t("toasts.error.description"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button onClick={completeInspection} disabled={saving} variant="outline">
      {saving
        ? t("actions.saving")
        : findingsCount > 0
        ? t("actions.complete")
        : t("actions.completeWithoutFindings")}
    </Button>
  );
}
