"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRoutineFromTemplate } from "@/server/actions/routine.actions";
import { toast } from "sonner";

interface CopyRoutineTemplateButtonProps {
  templateId: string;
  templateTitle: string;
}

export function CopyRoutineTemplateButton({
  templateId,
  templateTitle,
}: CopyRoutineTemplateButtonProps) {
  const t = useTranslations("dashboardRoutineTemplatesPage");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await createRoutineFromTemplate(templateId);
      if (result.success && result.data) {
        toast.success(t("toasts.successTitle", { title: templateTitle }), {
          description: t("toasts.successDescription"),
          action: {
            label: t("toasts.openRoutine"),
            onClick: () => router.push(`/dashboard/rutiner/${result.data!.id}`),
          },
        });
        router.refresh();
      } else {
        toast.error(result.error || t("toasts.errorGeneric"));
      }
    } catch {
      toast.error(t("toasts.errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button size="sm" type="button" onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
          {t("actions.savingCopy")}
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2 shrink-0" />
          {t("actions.saveAsMine")}
        </>
      )}
    </Button>
  );
}
