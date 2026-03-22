"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Edit } from "lucide-react";
import { useTranslations } from "next-intl";

interface UpdateAuditStatusFormProps {
  auditId: string;
  currentStatus: string;
  trigger?: React.ReactNode;
}

export function UpdateAuditStatusForm({
  auditId,
  currentStatus,
  trigger,
}: UpdateAuditStatusFormProps) {
  const t = useTranslations("dashboardAuditComponents.updateStatus");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const newStatus = formData.get("status") as string;

    const data = {
      id: auditId,
      status: newStatus as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
    };

    const result = await updateAudit(data);

    if (result.success) {
      toast({
        title: t("toasts.updated.title"),
        description: t("toasts.updated.description", { status: getStatusLabel(newStatus) }),
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PLANNED: t("status.planned"),
      IN_PROGRESS: t("status.inProgress"),
      COMPLETED: t("status.completed"),
      CANCELLED: t("status.cancelled"),
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            {t("actions.changeStatus")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">{t("newStatus")}</Label>
            <Select name="status" required disabled={loading} defaultValue={currentStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">{t("status.planned")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t("status.inProgress")}</SelectItem>
                <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
                <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-900">
                <strong>{t("tipLabel")}</strong> {t("tipText")}
              </p>
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
              {loading ? t("actions.updating") : t("actions.updateStatus")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

