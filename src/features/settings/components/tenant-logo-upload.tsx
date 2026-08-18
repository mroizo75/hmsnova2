"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TenantLogoUploadProps {
  currentLogoUrl?: string | null;
  isAdmin: boolean;
}

export function TenantLogoUpload({ currentLogoUrl, isAdmin }: TenantLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setPreviewUrl(data.logoUrl);
      toast({ title: "Logo lastet opp", description: "Logoen vises nå i dine PDF-rapporter." });
      router.refresh();
    } else {
      toast({ title: "Feil", description: data.error ?? "Kunne ikke laste opp logo", variant: "destructive" });
    }
  }

  async function handleRemove() {
    setRemoving(true);
    const res = await fetch("/api/settings/logo", { method: "DELETE" });
    setRemoving(false);
    if (res.ok) {
      setPreviewUrl(null);
      toast({ title: "Logo fjernet" });
      router.refresh();
    } else {
      toast({ title: "Feil", description: "Kunne ikke fjerne logo", variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Bedriftslogo
        </CardTitle>
        <CardDescription>
          Logoen vises i alle PDF-rapporter (HMS Håndbok, vernerunder, revisjoner m.m.).
          Anbefalt: PNG eller SVG med transparent bakgrunn, maks 2 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          {/* Preview */}
          <div className="flex h-20 w-40 items-center justify-center rounded-lg border bg-muted/30">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Bedriftslogo"
                className="max-h-16 max-w-36 object-contain"
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {previewUrl ? "Endre logo" : "Last opp logo"}
              </Button>

              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={removing}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Fjern logo
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
