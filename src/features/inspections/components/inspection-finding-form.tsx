"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface InspectionFindingFormProps {
  inspectionId: string;
  users: User[];
}

export function InspectionFindingForm({ inspectionId, users }: InspectionFindingFormProps) {
  const t = useTranslations("dashboardInspectionComponents.findingForm");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("inspectionId", inspectionId);

        const response = await fetch("/api/inspections/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || t("errors.uploadImage"));
        }

        setImages((prev) => [...prev, data.data.key]);
      }

      toast({
        title: t("toasts.imageUploaded.title"),
        description: t("toasts.imageUploaded.description"),
      });
    } catch (error: any) {
      toast({
        title: t("toasts.uploadError.title"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (imageKey: string) => {
    try {
      await fetch("/api/inspections/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: imageKey }),
      });

      setImages((prev) => prev.filter((key) => key !== imageKey));
      toast({
        title: t("toasts.imageRemoved"),
      });
    } catch (error) {
      toast({
        title: t("toasts.removeImageError"),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      severity: parseInt(formData.get("severity") as string),
      location: formData.get("location") as string,
      responsibleId: formData.get("responsibleId") as string || null,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string).toISOString() : null,
      imageKeys: images,
    };

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || t("errors.create"));
      }

      toast({
        title: t("toasts.created.title"),
        description: t("toasts.created.description"),
      });

      setOpen(false);
      setImages([]);
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("actions.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              {t("fields.title")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder={t("placeholders.title")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("fields.description")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder={t("placeholders.description")}
              rows={4}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="severity">
                {t("fields.severity")} <span className="text-destructive">*</span>
              </Label>
              <Select name="severity" required>
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholders.selectSeverity")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("severity.s1")}</SelectItem>
                  <SelectItem value="2">{t("severity.s2")}</SelectItem>
                  <SelectItem value="3">{t("severity.s3")}</SelectItem>
                  <SelectItem value="4">{t("severity.s4")}</SelectItem>
                  <SelectItem value="5">{t("severity.s5")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("fields.location")}</Label>
              <Input
                id="location"
                name="location"
                placeholder={t("placeholders.location")}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="responsibleId">{t("fields.responsible")}</Label>
              <Select name="responsibleId">
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholders.selectResponsible")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">{t("fields.dueDate")}</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>{t("fields.images")}</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={uploadingImage}
              />
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {uploadingImage ? t("actions.uploading") : t("actions.clickUpload")}
                </p>
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {images.map((imageKey) => (
                  <div key={imageKey} className="relative group">
                    <img
                      src={`/api/inspections/images/${imageKey}`}
                      alt={t("imageAlt")}
                      className="w-full h-24 object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(imageKey)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("actions.creating") : t("actions.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

