"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadNewVersion } from "@/server/actions/document.actions";
import { Upload } from "lucide-react";
import type { Document } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

interface NewVersionFormProps {
  document: Document;
}

export function NewVersionForm({ document }: NewVersionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("documentId", document.id);

    try {
      const result = await uploadNewVersion(formData);
      
      if (result.success) {
        toast({
          title: "🔄 Ny versjon lastet opp",
          description: "Dokumentet må godkjennes på nytt før det kan brukes",
          className: "bg-blue-50 border-blue-200",
        });
        router.push("/dashboard/documents");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Opplasting feilet",
          description: result.error || "Kunne ikke laste opp ny versjon",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt ved opplasting av ny versjon",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last opp ny versjon</CardTitle>
        <CardDescription>
          Gammel versjon ({document.version}) lagres i historikken. Ny versjon må godkjennes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="version">Versjonsnummer *</Label>
            <Input
              id="version"
              name="version"
              placeholder="v1.1 eller v2.0"
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Gjeldende: {document.version}. Bruk f.eks. v1.1 for mindre endringer, v2.0 for større.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="changeComment">Hva er endret? *</Label>
            <Input
              id="changeComment"
              name="changeComment"
              placeholder="F.eks. Oppdatert sikkerhetsprosedyrer i kap. 3"
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Beskriv kort hva som er endret (påkrevd for sporbarhet)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Ny fil *</Label>
            <Input
              id="file"
              name="file"
              type="file"
              required
              disabled={loading}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Valgt: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-900 mb-2">⚠️ Viktig</p>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Dokumentet får status <strong>UTKAST</strong> og må godkjennes på nytt</li>
              <li>Gammel versjon lagres permanent i historikken</li>
              <li>Endringskommentar er <strong>påkrevd</strong> (HMS-compliance)</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>Laster opp...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Last opp ny versjon
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

