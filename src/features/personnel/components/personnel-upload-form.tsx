"use client";

import { useState, useTransition } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  PERSONNEL_CATEGORIES,
  PERSONNEL_CATEGORY_LABELS,
  PERSONNEL_CATEGORY_LEGAL,
  type PersonnelCategory,
} from "@/features/personnel/lib/personnel-categories";

interface PersonnelUploadFormProps {
  userId: string;
  onUploaded?: () => void;
}

export function PersonnelUploadForm({ userId, onUploaded }: PersonnelUploadFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<PersonnelCategory>("CONTRACT");
  const [title, setTitle] = useState("");
  const [retainUntil, setRetainUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !title.trim()) {
      toast({ title: "Fyll ut tittel og velg fil", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("userId", userId);
      formData.set("title", title.trim());
      formData.set("category", category);
      formData.set("legalRef", PERSONNEL_CATEGORY_LEGAL[category]);
      if (retainUntil) formData.set("retainUntil", retainUntil);
      if (notes.trim()) formData.set("notes", notes.trim());

      const response = await fetch("/api/personnel/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast({
          title: payload?.message || "Kunne ikke laste opp fil",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Dokument lastet opp" });
      setTitle("");
      setNotes("");
      setRetainUntil("");
      setFile(null);
      onUploaded?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="personnel-category">Kategori</Label>
        <Select value={category} onValueChange={(value) => setCategory(value as PersonnelCategory)}>
          <SelectTrigger id="personnel-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERSONNEL_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {PERSONNEL_CATEGORY_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{PERSONNEL_CATEGORY_LEGAL[category]}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="personnel-title">Tittel</Label>
        <Input
          id="personnel-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="F.eks. Arbeidsavtale 2026"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="personnel-file">Fil (PDF, Word eller Excel, maks 10 MB)</Label>
        <Input
          id="personnel-file"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="personnel-retain">Slettefrist (GDPR art. 5)</Label>
        <Input
          id="personnel-retain"
          type="date"
          value={retainUntil}
          onChange={(event) => setRetainUntil(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Valgfritt. Sett når dokumentet ikke lenger skal oppbevares.
        </p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="personnel-notes">Merknad</Label>
        <Textarea
          id="personnel-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Ikke skriv helseopplysninger eller diagnose her"
        />
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Last opp
        </Button>
      </div>
    </form>
  );
}
