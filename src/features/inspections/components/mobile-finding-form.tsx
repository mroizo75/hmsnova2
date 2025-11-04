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

interface MobileFindingFormProps {
  inspectionId: string;
  onSuccess?: () => void;
}

export function MobileFindingForm({ inspectionId, onSuccess }: MobileFindingFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState<string[]>([]);
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
          throw new Error(data.message || "Kunne ikke laste opp bilde");
        }

        setImages((prev) => [...prev, data.data.key]);
      }

      toast({
        title: "📸 Bilde lagret",
        description: "Bildet er lagt til funnet",
      });
    } catch (error: any) {
      toast({
        title: "Feil ved opplasting",
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
        title: "Kunne ikke fjerne bilde",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Mangler informasjon",
        description: "Vennligst fyll ut tittel og beskrivelse",
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
        throw new Error(result.message || "Kunne ikke opprette funn");
      }

      toast({
        title: "✅ Funn registrert",
        description: "Funnet er nå lagret",
      });

      // Reset form
      setFormData({ title: "", description: "", severity: "3", location: "" });
      setImages([]);
      setStep(1);
      
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Feil",
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
      "1": "Lav",
      "2": "Moderat",
      "3": "Betydelig",
      "4": "Alvorlig",
      "5": "Kritisk",
    };
    return labels[severity] || "Betydelig";
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

      {/* Step 1: Ta bilder */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Steg 1: Ta bilder
            </CardTitle>
            <CardDescription>Dokumenter funnet med bilder (valgfritt)</CardDescription>
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
                    {uploadingImage ? "Laster opp..." : "Ta bilde"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Trykk for å åpne kamera
                  </p>
                </div>
              </label>

              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {images.map((imageKey) => (
                    <div key={imageKey} className="relative group aspect-square">
                      <img
                        src={`/api/inspections/images/${imageKey}`}
                        alt="Bilde"
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
              Neste: Beskriv funnet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Beskriv funnet */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Steg 2: Beskriv funnet
            </CardTitle>
            <CardDescription>Hva er funnet?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base">Tittel</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="F.eks. Manglende verneutstyr"
                className="text-base h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">Beskrivelse</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beskriv funnet i detalj..."
                rows={5}
                className="text-base resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Lokasjon (valgfritt)
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="F.eks. Produksjonshall A"
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
                Tilbake
              </Button>
              <Button
                onClick={() => setStep(3)}
                size="lg"
                className="flex-1 text-base h-12"
                disabled={!formData.title || !formData.description}
              >
                Neste
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Alvorlighetsgrad */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Steg 3: Alvorlighetsgrad
            </CardTitle>
            <CardDescription>Hvor alvorlig er funnet?</CardDescription>
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
                Tilbake
              </Button>
              <Button
                onClick={handleSubmit}
                size="lg"
                className="w-full text-base h-14 bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? "Lagrer..." : "✅ Lagre funn"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

