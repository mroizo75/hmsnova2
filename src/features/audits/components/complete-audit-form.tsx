"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { updateAudit } from "@/server/actions/audit.actions";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface CompleteAuditFormProps {
  auditId: string;
  currentSummary?: string | null;
  currentConclusion?: string | null;
  trigger?: React.ReactNode;
}

export function CompleteAuditForm({
  auditId,
  currentSummary,
  currentConclusion,
  trigger,
}: CompleteAuditFormProps) {
  const t = useTranslations("dashboardAuditComponents.completeAudit");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      id: auditId,
      status: "COMPLETED" as const,
      completedAt: new Date(),
      summary: formData.get("summary") as string,
      conclusion: formData.get("conclusion") as string,
    };

    const result = await updateAudit(data);

    if (result.success) {
      toast({
        title: t("toasts.completed.title"),
        description: t("toasts.completed.description"),
        className: "bg-green-50 border-green-200",
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.error.title"),
        description: result.error || t("toasts.error.description"),
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t("actions.complete")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summary">{t("summary.label")}</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={6}
              placeholder={t("summary.placeholder")}
              required
              disabled={loading}
              minLength={50}
              defaultValue={currentSummary || ""}
            />
            <p className="text-sm text-muted-foreground">
              {t("summary.help")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conclusion">{t("conclusion.label")}</Label>
            <Textarea
              id="conclusion"
              name="conclusion"
              rows={6}
              placeholder={t("conclusion.placeholder")}
              required
              disabled={loading}
              minLength={50}
              defaultValue={currentConclusion || ""}
            />
            <p className="text-sm text-muted-foreground">
              {t("conclusion.help")}
            </p>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                {t("iso.title")}
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>{t("iso.i1")}</li>
                <li>{t("iso.i2")}</li>
                <li>{t("iso.i3")}</li>
                <li>{t("iso.i4")}</li>
                <li>{t("iso.i5")}</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-900 mb-2">
                {t("tips.title")}
              </p>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>{t("tips.i1")}</li>
                <li>{t("tips.i2")}</li>
                <li>{t("tips.i3")}</li>
                <li>{t("tips.i4")}</li>
                <li>{t("tips.i5")}</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("actions.completing") : t("actions.complete")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

