"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, BookTemplate } from "lucide-react";
import { createSjaTemplate } from "@/server/actions/sja.actions";

interface HazardRow {
  activity: string;
  hazard: string;
  consequence: string;
  probability: number;
  severity: number;
  measures: string;
  responsibleName: string;
}

const emptyHazard: HazardRow = {
  activity: "",
  hazard: "",
  consequence: "",
  probability: 1,
  severity: 1,
  measures: "",
  responsibleName: "",
};

interface SjaCreateTemplateButtonProps {
  tenantId: string;
}

export function SjaCreateTemplateButton({ tenantId }: SjaCreateTemplateButtonProps) {
  const t = useTranslations("employeeSjaCreateTemplateButton");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hazards, setHazards] = useState<HazardRow[]>([{ ...emptyHazard }]);

  function addHazard() {
    setHazards([...hazards, { ...emptyHazard }]);
  }

  function removeHazard(index: number) {
    if (hazards.length <= 1) return;
    setHazards(hazards.filter((_, i) => i !== index));
  }

  function updateHazard(index: number, field: keyof HazardRow, value: string | number) {
    const updated = [...hazards];
    (updated[index] as any)[field] = value;
    setHazards(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const validHazards = hazards.filter(
      (h) => h.activity.trim() && h.hazard.trim() && h.measures.trim()
    );

    if (validHazards.length === 0) {
      toast({
        title: t("toast.error.title"),
        description: t("toast.error.noHazards"),
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createSjaTemplate({
        tenantId,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        workLocation: formData.get("workLocation") as string,
        hazards: validHazards,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: t("toast.success.title"),
        description: t("toast.success.description"),
      });

      setOpen(false);
      setHazards([{ ...emptyHazard }]);
      router.refresh();
    } catch (error: any) {
      toast({
        title: t("toast.error.title"),
        description: error.message || t("toast.error.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <BookTemplate className="h-4 w-4 mr-2" />
          {t("newButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-purple-600" />
            {t("dialogTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-sm">{t("fields.name.label")} *</Label>
              <Input
                name="name"
                placeholder={t("fields.name.placeholder")}
                required
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">{t("fields.workLocation.label")}</Label>
              <Input
                name="workLocation"
                placeholder={t("fields.workLocation.placeholder")}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">{t("fields.description.label")}</Label>
            <Textarea
              name="description"
              placeholder={t("fields.description.placeholder")}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("hazards.title")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addHazard}>
                <Plus className="h-3 w-3 mr-1" />
                {t("hazards.add")}
              </Button>
            </div>

            {hazards.map((hazard, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t("hazards.item", { index: index + 1 })}
                  </span>
                  {hazards.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHazard(index)}
                      className="h-6 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={hazard.activity}
                    onChange={(e) => updateHazard(index, "activity", e.target.value)}
                    placeholder={t("hazards.activity")}
                    className="text-sm"
                  />
                  <Input
                    value={hazard.hazard}
                    onChange={(e) => updateHazard(index, "hazard", e.target.value)}
                    placeholder={t("hazards.hazard")}
                    className="text-sm"
                  />
                </div>

                <Input
                  value={hazard.consequence}
                  onChange={(e) => updateHazard(index, "consequence", e.target.value)}
                  placeholder={t("hazards.consequence")}
                  className="text-sm"
                />

                <div className="grid gap-2 md:grid-cols-3">
                  <Select
                    value={String(hazard.probability)}
                    onValueChange={(v) => updateHazard(index, "probability", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={t("hazards.probability")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("hazards.probabilityOptions.o1")}</SelectItem>
                      <SelectItem value="2">{t("hazards.probabilityOptions.o2")}</SelectItem>
                      <SelectItem value="3">{t("hazards.probabilityOptions.o3")}</SelectItem>
                      <SelectItem value="4">{t("hazards.probabilityOptions.o4")}</SelectItem>
                      <SelectItem value="5">{t("hazards.probabilityOptions.o5")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={String(hazard.severity)}
                    onValueChange={(v) => updateHazard(index, "severity", Number(v))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={t("hazards.severity")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("hazards.severityOptions.o1")}</SelectItem>
                      <SelectItem value="2">{t("hazards.severityOptions.o2")}</SelectItem>
                      <SelectItem value="3">{t("hazards.severityOptions.o3")}</SelectItem>
                      <SelectItem value="4">{t("hazards.severityOptions.o4")}</SelectItem>
                      <SelectItem value="5">{t("hazards.severityOptions.o5")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    value={hazard.responsibleName}
                    onChange={(e) => updateHazard(index, "responsibleName", e.target.value)}
                    placeholder={t("hazards.responsible")}
                    className="text-sm"
                  />
                </div>

                <Textarea
                  value={hazard.measures}
                  onChange={(e) => updateHazard(index, "measures", e.target.value)}
                  placeholder={t("hazards.measures")}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BookTemplate className="h-4 w-4 mr-2" />
              )}
              {t("actions.create")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
