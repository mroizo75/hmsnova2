"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

function isAllowed(file: File) {
  return (
    file.type === "application/pdf" ||
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    /\.(pdf|jpe?g|png)$/i.test(file.name)
  );
}

interface CertificateFileDropProps {
  disabled?: boolean;
  label: string;
  onFile: (file: File | null) => void;
  className?: string;
}

export function CertificateFileDrop({ disabled, label, onFile, className }: CertificateFileDropProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function take(file: File | undefined) {
    if (!file) return;
    if (!isAllowed(file)) {
      setError("Kun PDF, JPG eller PNG");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Filen kan ikke være større enn 10 MB");
      return;
    }
    setError(null);
    onFile(file);
  }

  return (
    <div className="space-y-1">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setActive(false);
          if (disabled) return;
          take(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary",
          active && "border-primary bg-primary/5 text-primary",
          disabled && "pointer-events-none opacity-60",
          className,
        )}
      >
        <Upload className="h-4 w-4" />
        {label}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => take(event.target.files?.[0])}
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
