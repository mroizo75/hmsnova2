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
          throw new Error(data.message || "Kunne ikke laste opp bilde");
        }

        setImages((prev) => [...prev, data.data.key]);
      }

      toast({
        title: "Bilde lastet opp",
        description: "Bildet er nå lagt til funnet",
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
      toast({
        title: "Bilde fjernet",
      });
    } catch (error) {
      toast({
        title: "Kunne ikke fjerne bilde",
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
        throw new Error(result.message || "Kunne ikke opprette funn");
      }

      toast({
        title: "Funn opprettet",
        description: "Funnet er nå registrert",
      });

      setOpen(false);
      setImages([]);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Legg til funn
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrer nytt funn</DialogTitle>
          <DialogDescription>
            Dokumenter avvik, observasjoner eller forbedringsområder fra inspeksjonen
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Tittel <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. Manglende verneutstyr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Beskrivelse <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Beskriv funnet i detalj..."
              rows={4}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="severity">
                Alvorlighetsgrad <span className="text-destructive">*</span>
              </Label>
              <Select name="severity" required>
                <SelectTrigger>
                  <SelectValue placeholder="Velg alvorlighetsgrad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Lav</SelectItem>
                  <SelectItem value="2">2 - Moderat</SelectItem>
                  <SelectItem value="3">3 - Betydelig</SelectItem>
                  <SelectItem value="4">4 - Alvorlig</SelectItem>
                  <SelectItem value="5">5 - Kritisk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasjon</Label>
              <Input
                id="location"
                name="location"
                placeholder="F.eks. Produksjonshall A"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="responsibleId">Ansvarlig for oppfølging</Label>
              <Select name="responsibleId">
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansvarlig" />
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
              <Label htmlFor="dueDate">Frist for lukking</Label>
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
            <Label>Bilder</Label>
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
                  {uploadingImage ? "Laster opp..." : "Klikk for å laste opp bilder"}
                </p>
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {images.map((imageKey) => (
                  <div key={imageKey} className="relative group">
                    <img
                      src={`/api/inspections/images/${imageKey}`}
                      alt="Opplastet bilde"
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
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Oppretter..." : "Opprett funn"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

