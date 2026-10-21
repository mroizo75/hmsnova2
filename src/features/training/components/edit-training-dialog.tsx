"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateTraining } from "@/server/actions/training.actions";
import { CertificateFileDrop } from "@/features/training/components/certificate-file-drop";
import { useToast } from "@/hooks/use-toast";
import {
  Pencil,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import type { Training } from "@prisma/client";
import {
  parseProofDocKeys,
  formatProofDocKeys,
} from "@/features/training/lib/proof-doc-keys";

interface EditTrainingDialogProps {
  training: Training & { user?: { name: string | null; email: string } };
  trigger?: React.ReactNode;
}

export function EditTrainingDialog({ training, trigger }: EditTrainingDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(training.title);
  const [provider, setProvider] = useState(training.provider);
  const [completedAt, setCompletedAt] = useState(
    training.completedAt ? new Date(training.completedAt).toISOString().split("T")[0] : "",
  );
  const [validUntil, setValidUntil] = useState(
    training.validUntil ? new Date(training.validUntil).toISOString().split("T")[0] : "",
  );

  const existingKeys = parseProofDocKeys(training.proofDocKey);
  const [keptKeys, setKeptKeys] = useState<string[]>(existingKeys);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const removeKeptKey = (key: string) => {
    setKeptKeys((prev) => prev.filter((k) => k !== key));
  };

  const removeNewFile = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const addNewFile = (file: File | null) => {
    if (file) setNewFiles((prev) => [...prev, file]);
  };

  const uploadDiploma = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/training/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    const json = await res.json();
    return json.key ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const uploadedKeys: string[] = [];
      for (const file of newFiles) {
        const key = await uploadDiploma(file);
        if (!key) {
          toast({
            variant: "destructive",
            title: "Opplasting feilet",
            description: `Kunne ikke laste opp "${file.name}". Prøv igjen.`,
          });
          setLoading(false);
          return;
        }
        uploadedKeys.push(key);
      }

      const allKeys = [...keptKeys, ...uploadedKeys];
      const proofDocKey = formatProofDocKeys(allKeys) ?? "";

      const originalValidUntil = training.validUntil
        ? new Date(training.validUntil).toISOString().split("T")[0]
        : "";
      const originalCompletedAt = training.completedAt
        ? new Date(training.completedAt).toISOString().split("T")[0]
        : "";

      const result = await updateTraining({
        id: training.id,
        title: title !== training.title ? title : undefined,
        provider: provider !== training.provider ? provider : undefined,
        completedAt: completedAt
          ? completedAt
          : originalCompletedAt
            ? null
            : undefined,
        validUntil: validUntil
          ? validUntil
          : originalValidUntil
            ? null
            : undefined,
        proofDocKey,
      });

      if (result.success) {
        toast({
          title: "Kompetanse oppdatert",
          description: "Endringene er lagret",
          className: "bg-green-50 border-green-200",
        });
        setOpen(false);
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke oppdatere opplæring",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalDocs = keptKeys.length + newFiles.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" title="Rediger opplæring">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Rediger kompetanse
          </DialogTitle>
          <DialogDescription>
            {training.user?.name || training.user?.email} — {training.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kurstittel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Kursleverandør</Label>
            <Input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gjennomført dato</Label>
              <Input
                type="date"
                value={completedAt}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setCompletedAt(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label>Gyldig til</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Tomt felt = utløper ikke
              </p>
            </div>
          </div>

          {/* Diplom/sertifikat-seksjon - støtter flere filer */}
          <div className="space-y-2">
            <Label>Diplomer / Sertifikater ({totalDocs})</Label>

            {/* Eksisterende filer beholdt fra databasen */}
            {keptKeys.map((key, idx) => (
              <div key={key} className="flex items-center justify-between rounded-lg border bg-green-50 border-green-200 px-3 py-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">Dokument {idx + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-auto p-1"
                  onClick={() => removeKeptKey(key)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Nye filer lagt til */}
            {newFiles.map((file, idx) => (
              <div key={`new-${idx}`} className="flex items-center justify-between rounded-lg border bg-blue-50 border-blue-200 px-3 py-2">
                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate max-w-56">{file.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-auto p-1"
                  onClick={() => removeNewFile(idx)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {totalDocs === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Ingen dokumentasjon lastet opp
              </div>
            )}

            <CertificateFileDrop
              disabled={loading}
              label={
                totalDocs > 0
                  ? "Legg til enda et dokument"
                  : "Last opp diplom — dra fil hit eller klikk"
              }
              onFile={addNewFile}
            />
            <p className="text-xs text-muted-foreground">
              Du kan laste opp flere dokumenter per kurs (f.eks. teori + praksis fra ulike leverandører)
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lagrer...
                </>
              ) : (
                "Lagre endringer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
