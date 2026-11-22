"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface GalleryImage {
  key: string;
  src: string;
  alt: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  columns?: string;
  onRemove?: (key: string) => void;
  removingKey?: string | null;
}

export function ImageGallery({ images, columns = "grid-cols-3", onRemove, removingKey }: ImageGalleryProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = images.find((image) => image.key === openKey) ?? null;

  if (images.length === 0) return null;

  return (
    <>
      <div className={`grid gap-2 ${columns}`}>
        {images.map((image) => (
          <div key={image.key} className="relative">
            <button
              type="button"
              className="w-full cursor-pointer overflow-hidden rounded border bg-muted text-left"
              onClick={() => setOpenKey(image.key)}
              aria-label={`Åpne ${image.alt}`}
            >
              {/* Brukeropplastede filer krever innlogging. next/image henter uten økt. */}
              <img src={image.src} alt={image.alt} className="h-24 w-full object-cover" />
            </button>
            {onRemove && (
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white disabled:opacity-50"
                aria-label={`Fjern ${image.alt}`}
                disabled={removingKey === image.key}
                onClick={() => onRemove(image.key)}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <Dialog open={active !== null} onOpenChange={(open) => { if (!open) setOpenKey(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{active?.alt ?? "Bilde"}</DialogTitle>
            <DialogDescription>Klikk utenfor for å lukke.</DialogDescription>
          </DialogHeader>
          {active && (
            <a href={active.src} target="_blank" rel="noopener noreferrer">
              <img
                src={active.src}
                alt={active.alt}
                className="max-h-[75vh] w-full rounded object-contain"
              />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
