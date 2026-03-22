"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface UpdateInspectionStatusFormProps {
  inspectionId: string;
  currentStatus: string;
}

export function UpdateInspectionStatusForm({
  inspectionId,
  currentStatus,
}: UpdateInspectionStatusFormProps) {
  const t = useTranslations("dashboardInspectionComponents.updateStatus");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const status = formData.get("status") as string;
    
    const data: any = { status };
    
    // Hvis status endres til COMPLETED, sett completedDate
    if (status === "COMPLETED") {
      data.completedDate = new Date().toISOString();
    }

    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t("errors.update"));
      }

      toast({
        title: t("toasts.updated.title"),
        description: t("toasts.updated.description"),
      });

      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: t("toasts.error.title"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("actions.changeStatus")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">{t("statusLabel")}</Label>
            <Select name="status" defaultValue={currentStatus} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">{t("status.planned")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t("status.inProgress")}</SelectItem>
                <SelectItem value="COMPLETED">{t("status.completed")}</SelectItem>
                <SelectItem value="CANCELLED">{t("status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("actions.saving") : t("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

