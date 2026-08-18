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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { enqueueSafe, isNetworkError, isAvailable, type OfflineQueueEntry } from "@/lib/offline-queue";

interface MobileFindingFormProps {
  inspectionId: string;
  onSuccess?: () => void;
}

export function MobileFindingForm({ inspectionId, onSuccess }: MobileFindingFormProps) {
  const t = useTranslations("dashboardInspectionComponents.mobileFindingForm");
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "3",
    location: "",
  });

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!navigator.onLine) {
      const newFiles = Array.from(files);
      setPendingImageFiles((prev) => [...prev, ...newFiles]);
      toast({
        title: t("toasts.imageSaved.title"),
        description: "Bildet lagres lokalt og lastes opp ved synkronisering.",
      });
      return;
    }

    setUploadingImage(true);

    try {
      for (const file of Array.from(files)) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);
        formDataUpload.append("inspectionId", inspectionId);

        const response = await fetch("/api/inspections/upload", {
          method: "POST",
          body: formDataUpload,
        });

        const data = await response.json();

        if (!response.ok) {
          setPendingImageFiles((prev) => [...prev, file]);
          throw new Error(data.message || t("errors.uploadImage"));
        }

        setImages((prev) => [...prev, data.data.key]);
      }

      toast({
        title: t("toasts.imageSaved.title"),
        description: t("toasts.imageSaved.description"),
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
    } catch (error) {
      toast({
        title: t("toasts.removeImageError"),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: t("toasts.missingInfo.title"),
        description: t("toasts.missingInfo.description"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const data = {
      title: formData.title,
      description: formData.description,
      severity: parseInt(formData.severity),
      location: formData.location || null,
      responsibleId: null,
      dueDate: null,
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

      // Reset form
      setFormData({ title: "", description: "", severity: "3", location: "" });
      setImages([]);
      setPendingImageFiles([]);
      setStep(1);
      
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error: any) {
      if (isNetworkError(error) && isAvailable()) {
        const offlineFiles: OfflineQueueEntry["files"] = pendingImageFiles.map((f) => ({
          fieldName: "file",
          name: f.name,
          type: f.type,
          blob: f,
        }));
        const result = await enqueueSafe({
          id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "inspection_finding",
          createdAt: new Date().toISOString(),
          endpoint: `/api/inspections/${inspectionId}/findings`,
          payload: { ...data, imageKeys: images },
          files: offlineFiles,
          meta: { inspectionId, uploadEndpoint: "/api/inspections/upload" },
        });
        if (result.stored) {
          toast({
            title: "Lagret lokalt",
            description: "Funnet sendes automatisk når du er tilbake online.",
            className: "bg-amber-50 border-amber-200",
          });
          setFormData({ title: "", description: "", severity: "3", location: "" });
          setImages([]);
          setPendingImageFiles([]);
          setStep(1);
          if (onSuccess) onSuccess();
          return;
        }
        toast({
          title: "Offline-køen er full",
          description: result.reason === "quota_size"
            ? "For mange bilder lagret lokalt. Koble til nett og synkroniser først."
            : "Maks antall ventende registreringer nådd. Synkroniser først.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("toasts.error.title"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      "1": "bg-blue-100 text-blue-900 border-blue-300",
      "2": "bg-green-100 text-green-900 border-green-300",
      "3": "bg-yellow-100 text-yellow-900 border-yellow-300",
      "4": "bg-orange-100 text-orange-900 border-orange-300",
      "5": "bg-red-100 text-red-900 border-red-300",
    };
    return colors[severity] || colors["3"];
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      "1": t("severity.low"),
      "2": t("severity.moderate"),
      "3": t("severity.significant"),
      "4": t("severity.serious"),
      "5": t("severity.critical"),
    };
    return labels[severity] || t("severity.significant");
  };

  return (
    <div className="pb-20 space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 1 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
        }`}>
          1
        </div>
        <div className={`w-16 h-1 ${step >= 2 ? "bg-primary" : "bg-gray-200"}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 2 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
        }`}>
          2
        </div>
        <div className={`w-16 h-1 ${step >= 3 ? "bg-primary" : "bg-gray-200"}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 3 ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-500"
        }`}>
          3
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {t("step1.title")}
            </CardTitle>
            <CardDescription>{t("step1.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Input */}
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleImageCapture}
                className="hidden"
                id="camera-input"
                disabled={uploadingImage}
              />
              <label htmlFor="camera-input">
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors active:scale-95">
                  <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium text-lg">
                    {uploadingImage ? t("actions.uploading") : t("actions.takePhoto")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("step1.cameraHint")}
                  </p>
                </div>
              </label>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {images.map((imageKey) => (
                    <div key={imageKey} className="relative group aspect-square">
                      <img
                        src={`/api/inspections/images/${imageKey}`}
                        alt={t("imageAlt")}
                        className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-90"
                        onClick={() => removeImage(imageKey)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => setStep(2)}
              size="lg"
              className="w-full text-lg h-14"
            >
              {t("step1.next")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("step2.title")}
            </CardTitle>
            <CardDescription>{t("step2.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base">{t("fields.title")}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("placeholders.title")}
                className="text-base h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">{t("fields.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("placeholders.description")}
                rows={5}
                className="text-base resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t("fields.locationOptional")}
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t("placeholders.location")}
                className="text-base h-12"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                size="lg"
                className="flex-1 text-base h-12"
              >
                {t("actions.back")}
              </Button>
              <Button
                onClick={() => setStep(3)}
                size="lg"
                className="flex-1 text-base h-12"
                disabled={!formData.title || !formData.description}
              >
                {t("actions.next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {t("step3.title")}
            </CardTitle>
            <CardDescription>{t("step3.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {["5", "4", "3", "2", "1"].map((severity) => (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity })}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all active:scale-95 ${
                    formData.severity === severity
                      ? getSeverityColor(severity) + " border-current"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">{severity}</span>
                    <span className="font-medium">{getSeverityLabel(severity)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                size="lg"
                className="w-full text-base h-12"
              >
                {t("actions.back")}
              </Button>
              <Button
                onClick={handleSubmit}
                size="lg"
                className="w-full text-base h-14 bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? t("actions.saving") : t("actions.saveFinding")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

