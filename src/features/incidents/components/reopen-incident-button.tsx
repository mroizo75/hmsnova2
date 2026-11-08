"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { reopenIncident } from "@/server/actions/incident.actions";
import { useToast } from "@/hooks/use-toast";

export function ReopenIncidentButton({ incidentId }: { incidentId: string }) {
  const t = useTranslations("dashboardIncidentDetailPage.sections.closed");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReopen() {
    setLoading(true);
    try {
      const result = await reopenIncident(incidentId);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: t("reopenFailed"),
          description: result.error,
        });
        return;
      }
      toast({
        title: t("reopen"),
        description: t("reopened"),
        className: "bg-green-50 border-green-200",
      });
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["incidents", incidentId] });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="bg-transparent">
          <RotateCcw className="mr-2 h-4 w-4" />
          {t("reopen")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("reopenConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("reopenHint")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t("reopenCancel")}</AlertDialogCancel>
          <Button type="button" onClick={() => void handleReopen()} disabled={loading}>
            {loading ? t("reopening") : t("reopenConfirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
