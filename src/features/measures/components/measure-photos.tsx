"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageGallery } from "@/components/shared/image-gallery";
import { useToast } from "@/hooks/use-toast";

export interface MeasurePhoto {
  id: string;
  fileKey: string;
  name: string;
  mime: string;
}

interface MeasurePhotosProps {
  measureId: string;
  initialPhotos?: MeasurePhoto[];
  compact?: boolean;
}

const MAX_PHOTOS = 8;

function toGallery(photos: MeasurePhoto[]) {
  return photos
    .filter((photo) => photo.mime.startsWith("image/"))
    .map((photo) => ({
      key: photo.id,
      src: `/api/files/${photo.fileKey}`,
      alt: photo.name,
    }));
}

export function MeasurePhotos({ measureId, initialPhotos = [], compact = false }: MeasurePhotosProps) {
  const { toast } = useToast();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/measures/${measureId}/photos`)
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { data?: MeasurePhoto[] };
        if (!cancelled && Array.isArray(payload.data)) setPhotos(payload.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [measureId]);

  const upload = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      toast({
        variant: "destructive",
        title: "For mange bilder",
        description: `Maks ${MAX_PHOTOS} bilder per tiltak.`,
      });
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      files.forEach((file) => body.append("images", file));
      const response = await fetch(`/api/measures/${measureId}/photos`, {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { data?: MeasurePhoto[]; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Kunne ikke laste opp bilder");
      }
      setPhotos((current) => [...current, ...payload.data!]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Opplasting feilet",
        description: error instanceof Error ? error.message : "Kunne ikke laste opp bilder",
      });
    } finally {
      setUploading(false);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  };

  const remove = async (photoId: string) => {
    setDeletingId(photoId);
    try {
      const response = await fetch(`/api/measures/${measureId}/photos/${photoId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Kunne ikke slette bildet");
      }
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: error instanceof Error ? error.message : "Kunne ikke slette bildet",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const gallery = (
    <div className="space-y-2">
      <ImageGallery
        images={toGallery(photos)}
        onRemove={(photoId) => void remove(photoId)}
        removingKey={deletingId}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void upload(event.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void upload(event.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-transparent"
          disabled={uploading || photos.length >= MAX_PHOTOS}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          {uploading ? "Laster opp…" : "Ta bilde"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-transparent"
          disabled={uploading || photos.length >= MAX_PHOTOS}
          onClick={() => galleryRef.current?.click()}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Fra galleriet
        </Button>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground">Bilder av utført tiltak</p>
        {gallery}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumentasjon av utført tiltak</CardTitle>
        <CardDescription>
          Legg ved bilder som viser at tiltaket er utført. Bildene følger avviket (ISO 45001 kap. 10.2).
        </CardDescription>
      </CardHeader>
      <CardContent>{gallery}</CardContent>
    </Card>
  );
}
