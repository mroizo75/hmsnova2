"use client";

import { useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createChemical, updateChemical } from "@/server/actions/chemical.actions";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";
import type { Chemical } from "@prisma/client";
import { HazardPictogramSelector } from "./hazard-pictogram-selector";
import { PPESelector } from "./ppe-selector";

interface ChemicalFormProps {
  chemical?: Chemical;
  mode?: "create" | "edit";
}

export function ChemicalForm({ chemical, mode = "create" }: ChemicalFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sdsFile, setSdsFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      productName: formData.get("productName") as string,
      supplier: formData.get("supplier") as string || undefined,
      casNumber: formData.get("casNumber") as string || undefined,
      hazardClass: formData.get("hazardClass") as string || undefined,
      hazardStatements: formData.get("hazardStatements") as string || undefined,
      warningPictograms: formData.get("warningPictograms") as string || undefined,
      requiredPPE: formData.get("requiredPPE") as string || undefined,
      sdsVersion: formData.get("sdsVersion") as string || undefined,
      sdsDate: formData.get("sdsDate") as string || undefined,
      nextReviewDate: formData.get("nextReviewDate") as string || undefined,
      location: formData.get("location") as string || undefined,
      quantity: formData.get("quantity") as string || undefined,
      unit: formData.get("unit") as string || undefined,
      status: formData.get("status") as string,
      notes: formData.get("notes") as string || undefined,
    };

    try {
      const result =
        mode === "edit" && chemical
          ? await updateChemical(chemical.id, data, sdsFile || undefined)
          : await createChemical(data, sdsFile || undefined);

      if (result.success) {
        toast({
          title: mode === "edit" ? "✅ Kjemikalie oppdatert" : "✅ Kjemikalie registrert",
          description: mode === "edit" ? "Endringene er lagret" : "Produktet er lagt til i stoffkartoteket",
          className: "bg-green-50 border-green-200",
        });
        router.push("/dashboard/chemicals");
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Feil",
          description: result.error || "Kunne ikke lagre kjemikalie",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uventet feil",
        description: "Noe gikk galt",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Produktinformasjon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Produktinformasjon
          </CardTitle>
          <CardDescription>Grunnleggende informasjon om kjemikaliet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Produktnavn *</Label>
            <Input
              id="productName"
              name="productName"
              placeholder="F.eks. Rengjøringsmiddel XYZ"
              required
              disabled={loading}
              defaultValue={chemical?.productName}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier">Leverandør</Label>
              <Input
                id="supplier"
                name="supplier"
                placeholder="Leverandørnavn"
                disabled={loading}
                defaultValue={chemical?.supplier || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="casNumber">CAS-nummer</Label>
              <Input
                id="casNumber"
                name="casNumber"
                placeholder="000-00-0"
                disabled={loading}
                defaultValue={chemical?.casNumber || ""}
              />
              <p className="text-xs text-muted-foreground">
                Unikt identifikasjonsnummer for kjemisk stoff
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Lagringssted</Label>
              <Input
                id="location"
                name="location"
                placeholder="F.eks. Lager A, hylle 3"
                disabled={loading}
                defaultValue={chemical?.location || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select name="status" required disabled={loading} defaultValue={chemical?.status || "ACTIVE"}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">I bruk</SelectItem>
                  <SelectItem value="PHASED_OUT">Utfases</SelectItem>
                  <SelectItem value="ARCHIVED">Arkivert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Mengde</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                placeholder="10"
                disabled={loading}
                defaultValue={chemical?.quantity || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Enhet</Label>
              <Select name="unit" disabled={loading} defaultValue={chemical?.unit || "liter"}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg enhet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liter">Liter</SelectItem>
                  <SelectItem value="kg">Kilogram</SelectItem>
                  <SelectItem value="stk">Stykk</SelectItem>
                  <SelectItem value="m3">Kubikkmeter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farepiktogrammer og klassifisering */}
      <Card>
        <CardHeader>
          <CardTitle>Faremarkering (GHS/CLP)</CardTitle>
          <CardDescription>Fareklassifisering og varslingspiktogrammer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="hazardClass">Fareklasse</Label>
            <Input
              id="hazardClass"
              name="hazardClass"
              placeholder="F.eks. GHS02, GHS07"
              disabled={loading}
              defaultValue={chemical?.hazardClass || ""}
            />
            <p className="text-xs text-muted-foreground">
              Global Harmonized System fareklassifisering
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hazardStatements">H-setninger</Label>
            <Textarea
              id="hazardStatements"
              name="hazardStatements"
              rows={3}
              placeholder="F.eks. H226 (Brannfarlig væske og damp), H315 (Irriterer huden)"
              disabled={loading}
              defaultValue={chemical?.hazardStatements || ""}
            />
            <p className="text-xs text-muted-foreground">
              Faresetninger (Hazard statements)
            </p>
          </div>

          <HazardPictogramSelector defaultValue={chemical?.warningPictograms || ""} />
        </CardContent>
      </Card>

      {/* Personlig verneutstyr */}
      <Card>
        <CardHeader>
          <CardTitle>Personlig verneutstyr (PPE)</CardTitle>
          <CardDescription>Påkrevd verneutstyr ved håndtering (ISO 7010)</CardDescription>
        </CardHeader>
        <CardContent>
          <PPESelector defaultValue={chemical?.requiredPPE || ""} />
        </CardContent>
      </Card>

      {/* Sikkerhetsdatablad */}
      <Card>
        <CardHeader>
          <CardTitle>Sikkerhetsdatablad (SDS)</CardTitle>
          <CardDescription>Last opp sikkerhetsdatablad i PDF-format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sdsFile">Datablad (PDF) {mode === "create" && "*"}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sdsFile"
                type="file"
                accept=".pdf"
                onChange={(e) => setSdsFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
              {chemical?.sdsKey && !sdsFile && (
                <Button variant="outline" size="sm" disabled>
                  <FileText className="h-4 w-4 mr-2" />
                  Eksisterende
                </Button>
              )}
            </div>
            {!chemical?.sdsKey && mode === "create" && (
              <p className="text-xs text-red-600">
                Sikkerhetsdatablad er påkrevd for nye kjemikalier
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sdsVersion">Versjon</Label>
              <Input
                id="sdsVersion"
                name="sdsVersion"
                placeholder="F.eks. 3.2"
                disabled={loading}
                defaultValue={chemical?.sdsVersion || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sdsDate">Dato for datablad</Label>
              <Input
                id="sdsDate"
                name="sdsDate"
                type="date"
                disabled={loading}
                defaultValue={
                  chemical?.sdsDate
                    ? new Date(chemical.sdsDate).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextReviewDate">Neste revisjon</Label>
              <Input
                id="nextReviewDate"
                name="nextReviewDate"
                type="date"
                disabled={loading}
                defaultValue={
                  chemical?.nextReviewDate
                    ? new Date(chemical.nextReviewDate).toISOString().split("T")[0]
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0]
                }
              />
              <p className="text-xs text-muted-foreground">
                Anbefalt: Årlig gjennomgang
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notater */}
      <Card>
        <CardHeader>
          <CardTitle>Tilleggsinfo</CardTitle>
          <CardDescription>Notater og kommentarer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notater</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Spesielle håndteringsinstruksjoner, restriksjoner, etc..."
              disabled={loading}
              defaultValue={chemical?.notes || ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* ISO 9001 Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-blue-900 mb-2">
            📋 HMS-krav og beste praksis
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Alle kjemikalier må ha oppdatert sikkerhetsdatablad</li>
            <li>Gjennomgå databladene minimum årlig</li>
            <li>Sikre at ansatte har tilgang til relevante sikkerhetsdatablad</li>
            <li>Dokumenter opplæring i sikker håndtering</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Avbryt
        </Button>
        <Button type="submit" disabled={loading || (mode === "create" && !sdsFile)}>
          {loading ? "Lagrer..." : mode === "edit" ? "Lagre endringer" : "Registrer kjemikalie"}
        </Button>
      </div>
    </form>
  );
}

