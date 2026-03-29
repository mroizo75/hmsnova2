"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileUp } from "lucide-react";
import { createUploadedIncident } from "@/server/actions/incident.actions";

export function UploadIncidentDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<"INTERNAL" | "EXTERNAL">("EXTERNAL");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setSource("EXTERNAL");
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Mangler tittel",
        description: "Skriv inn en tittel for avviket.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("source", source);
      if (file) {
        formData.append("file", file);
      }

      const result = await createUploadedIncident(formData);

      if (result.success) {
        toast({
          title: "Avvik opprettet",
          description: `Avviket "${title}" er registrert.`,
        });
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke opprette avvik.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Noe gikk galt. Prøv igjen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Last opp avvik
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Last opp avvik</DialogTitle>
          <DialogDescription>
            Registrer et avvik med minimal informasjon. Detaljer fylles inn ved behandling.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="upload-title">Tittel</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kort beskrivelse av avviket"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label>Kilde</Label>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as "INTERNAL" | "EXTERNAL")}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXTERNAL">Ekstern (mottatt utenfra)</SelectItem>
                <SelectItem value="INTERNAL">Intern (registrert internt)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="upload-file">Fil (valgfritt)</Label>
            <div className="mt-1">
              <label
                htmlFor="upload-file"
                className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 hover:border-primary/50 transition-colors"
              >
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  {file ? (
                    <p className="text-sm font-medium truncate">{file.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Klikk for å velge fil (PDF, bilde, etc.)
                    </p>
                  )}
                </div>
              </label>
              <input
                ref={fileInputRef}
                id="upload-file"
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Oppretter...
              </>
            ) : (
              "Opprett avvik"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
