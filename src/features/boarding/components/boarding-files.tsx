"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadBoardingFile } from "@/server/actions/boarding.actions";

interface BoardingFile {
  id: string;
  name: string;
  fileKey: string;
  size: number | null;
}

export function BoardingFiles({
  boardingId,
  files,
  canUpload,
}: {
  boardingId: string;
  files: BoardingFile[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("boardingId", boardingId);
    formData.set("file", file);
    const result = await uploadBoardingFile(formData);
    setUploading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen filer er lastet opp ennå.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.id}>
              <a
                href={`/api/files/${file.fileKey}`}
                className="inline-flex items-center gap-2 text-sm underline"
              >
                <FileText className="h-4 w-4" />
                {file.name}
              </a>
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <div>
          <Button type="button" variant="outline" className="bg-transparent" disabled={uploading} asChild>
            <label>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Laster opp..." : "Last opp fil"}
              <input type="file" className="sr-only" onChange={onFile} />
            </label>
          </Button>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
