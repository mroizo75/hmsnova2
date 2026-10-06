"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, ShieldCheck } from "lucide-react";
import { RiskCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { RiskImportPreview } from "@/features/risks/lib/risk-import";
import {
  confirmRiskAssessmentImport,
  previewRiskAssessmentImport,
} from "@/server/actions/risk-import.actions";

interface RiskAssessmentImportCardProps {
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
}

type EditableRow = RiskImportPreview["rows"][number] & { selected: boolean };

interface PreviewState extends Omit<RiskImportPreview, "rows"> {
  rows: EditableRow[];
  fileKey: string;
  fileName: string;
  mimeType: string;
}

export function RiskAssessmentImportCard({
  users,
  currentUserId,
}: RiskAssessmentImportCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function handlePreview() {
    if (!file) return;
    setIsParsing(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await previewRiskAssessmentImport(formData);
    setIsParsing(false);
    if ("error" in result) {
      toast({
        title: "Kunne ikke lese risikovurderingen",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    setPreview({
      ...result.data,
      rows: result.data.rows.map((row) => ({ ...row, selected: true })),
    });
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setPreview((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row, rowIndex) =>
              rowIndex === index ? { ...row, ...patch } : row,
            ),
          }
        : current,
    );
  }

  async function handleConfirm() {
    if (!preview) return;
    const selectedRows = preview.rows
      .filter((row) => row.selected)
      .map(({ selected: _selected, ...row }) => row);
    if (selectedRows.length === 0) {
      toast({
        title: "Ingen risikopunkter valgt",
        description: "Velg minst ett punkt som skal importeres.",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    const result = await confirmRiskAssessmentImport({
      title: preview.title,
      assessmentYear: preview.assessmentYear,
      participants: preview.participants,
      rows: selectedRows,
      fileKey: preview.fileKey,
      fileName: preview.fileName,
      mimeType: preview.mimeType,
      ownerId,
    });
    setIsConfirming(false);
    if ("error" in result) {
      toast({
        title: "Importen ble ikke lagret",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Risikovurderingen er importert",
      description: "Den må verifiseres av en godkjenner før den kan godkjennes.",
    });
    router.push(`/dashboard/risks/assessment/${result.data.id}`);
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileUp className="h-5 w-5 text-primary" />
          Importer eksisterende risikovurdering
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Last opp PDF, Word eller Excel (.xlsx). Excel leses fra kolonnene i
          risikoregisteret. PDF og Word tolkes til et utkast. Innholdet må
          kontrolleres og verifiseres av et menneske.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!preview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="risk-import-file">Dokument</Label>
              <Input
                id="risk-import-file"
                type="file"
                accept=".pdf,.doc,.docx,.xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="button"
              onClick={() => void handlePreview()}
              disabled={!file || isParsing}
            >
              {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isParsing ? "Tolker dokumentet …" : "Lag forhåndsvisning"}
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4" />
                Importert – må verifiseres
              </p>
              <p className="mt-1">
                Ukjente verdier er markert. Kontroller dem mot originalfilen før
                godkjenning, jf. IK-HMS § 5 nr. 3 og 6.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="import-title">Tittel</Label>
                <Input
                  id="import-title"
                  value={preview.title}
                  onChange={(event) =>
                    setPreview({ ...preview, title: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-year">År</Label>
                <Input
                  id="import-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={preview.assessmentYear}
                  onChange={(event) =>
                    setPreview({
                      ...preview,
                      assessmentYear: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="import-participants">Deltakere</Label>
                <Input
                  id="import-participants"
                  value={preview.participants ?? ""}
                  onChange={(event) =>
                    setPreview({
                      ...preview,
                      participants: event.target.value || null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Risikoeier</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {preview.rows.map((row, index) => (
                <div
                  key={`${index}-${row.title}`}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={(checked) =>
                        updateRow(index, { selected: checked === true })
                      }
                    />
                    <span className="font-medium">Importer risikopunkt {index + 1}</span>
                  </label>
                  {row.missingFields.length > 0 && (
                    <p className="text-xs font-medium text-amber-700">
                      Må kontrolleres: {row.missingFields.join(", ")}
                    </p>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Tittel</Label>
                      <Input
                        value={row.title}
                        onChange={(event) =>
                          updateRow(index, { title: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Kategori</Label>
                      <Select
                        value={row.category}
                        onValueChange={(value) =>
                          updateRow(index, { category: value as RiskCategory })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.values(RiskCategory).map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Fare og sammenheng</Label>
                    <Textarea
                      value={row.context}
                      onChange={(event) =>
                        updateRow(index, { context: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Sannsynlighet (1–5)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={row.likelihood}
                        onChange={(event) =>
                          updateRow(index, { likelihood: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Konsekvens (1–5)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={row.consequence}
                        onChange={(event) =>
                          updateRow(index, {
                            consequence: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Eksisterende tiltak</Label>
                    <Textarea
                      value={row.existingControls ?? ""}
                      onChange={(event) =>
                        updateRow(index, {
                          existingControls: event.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Planlagte tiltak (ett per linje)</Label>
                    <Textarea
                      value={row.measures.join("\n")}
                      onChange={(event) =>
                        updateRow(index, {
                          measures: event.target.value
                            .split("\n")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isConfirming || !ownerId}
              >
                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importer valgte punkter
              </Button>
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => setPreview(null)}
                disabled={isConfirming}
              >
                Velg annen fil
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
