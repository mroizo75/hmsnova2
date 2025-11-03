"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createDocument } from "@/server/actions/document.actions";
import { Upload } from "lucide-react";

interface DocumentFormProps {
  tenantId: string;
}

const documentKinds = [
  { value: "LAW", label: "Lov" },
  { value: "PROCEDURE", label: "Prosedyre" },
  { value: "CHECKLIST", label: "Sjekkliste" },
  { value: "FORM", label: "Skjema" },
  { value: "SDS", label: "Sikkerhetsdatablad" },
  { value: "PLAN", label: "Plan" },
  { value: "OTHER", label: "Annet" },
];

export function DocumentForm({ tenantId }: DocumentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("tenantId", tenantId);
    formData.append("changeComment", "Første versjon opprettet");

    try {
      const result = await createDocument(formData);
      
      if (result.success) {
        toast({
          title: "📄 Dokument opprettet",
          description: "Dokumentet er lastet opp og venter på godkjenning",
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/documents");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Opplasting feilet",
          description: result.error || "Kunne ikke laste opp dokument",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt ved opplasting av dokument",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last opp nytt dokument</CardTitle>
        <CardDescription>
          Dokumentet vil få status UTKAST og må godkjennes før bruk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              name="title"
              placeholder="F.eks. HMS-håndbok 2025"
              required
              disabled={loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kind">Type dokument *</Label>
              <Select name="kind" required disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg type" />
                </SelectTrigger>
                <SelectContent>
                  {documentKinds.map((kind) => (
                    <SelectItem key={kind.value} value={kind.value}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Versjon</Label>
              <Input
                id="version"
                name="version"
                placeholder="v1.0"
                defaultValue="v1.0"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Fil *</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                name="file"
                type="file"
                required
                disabled={loading}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Valgt: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Støttede formater: PDF, Word, Excel, TXT
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">ℹ️ Viktig informasjon</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Dokumentet får status <strong>UTKAST</strong> etter opplasting</li>
              <li>Må <strong>godkjennes</strong> av HMS-leder/Admin før bruk</li>
              <li>Alle versjoner lagres permanent for sporbarhet</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>Laster opp...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Last opp dokument
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Avbryt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
