"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Link2,
  SkipForward,
  Download,
} from "lucide-react";

interface ImportResult {
  row: number;
  name: string;
  status: "created" | "linked" | "skipped" | "error";
  email?: string;
  message?: string;
}

interface ImportSummary {
  total: number;
  created: number;
  linked: number;
  skipped: number;
  errors: number;
}

interface ExcelImportTenantsProps {
  groupId: string;
}

const statusConfig = {
  created: { label: "Opprettet", icon: CheckCircle, color: "text-green-600" },
  linked: { label: "Tilknyttet", icon: Link2, color: "text-blue-600" },
  skipped: { label: "Hoppet over", icon: SkipForward, color: "text-gray-500" },
  error: { label: "Feil", icon: XCircle, color: "text-red-600" },
};

export function ExcelImportTenants({ groupId }: ExcelImportTenantsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setResults(null);
    setSummary(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("groupId", groupId);

      const res = await fetch("/api/konsern/import-tenants", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Import feilet", description: data.error, variant: "destructive" });
        setUploading(false);
        return;
      }

      setResults(data.results);
      setSummary(data.summary);
      const emailsSent = (data.results as ImportResult[]).filter(
        (r) => r.message?.includes("Velkomst-e-post sendt")
      ).length;
      toast({
        title: "Import fullført",
        description: `${data.summary.created} opprettet, ${data.summary.linked} tilknyttet, ${emailsSent} e-poster sendt, ${data.summary.errors} feil`,
      });
      router.refresh();
    } catch (err) {
      toast({ title: "Feil", description: String(err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4" />
          Importer bedrifter fra Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Importerer {fileName}...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-600">
                Last opp en Excel-fil (.xlsx) med bedriftene
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                Velg fil
              </Button>
            </>
          )}
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Forventede kolonner i Excel-filen:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
            <span><strong>Bedriftsnavn</strong> (påkrevd)</span>
            <span>Org.nr</span>
            <span>Kontaktperson</span>
            <span>E-post</span>
            <span>Telefon</span>
            <span>Adresse</span>
            <span>By / Poststed</span>
            <span>Postnr</span>
            <span>Bransje</span>
            <span>Antall ansatte</span>
          </div>
          <p className="mt-2 text-[10px] text-gray-400">
            Kolonneoverskriftene kan være på norsk eller engelsk. Kun &quot;Bedriftsnavn&quot; er obligatorisk.
          </p>
        </div>

        {/* Resultater */}
        {summary && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-green-50 p-2 text-center">
                <p className="text-lg font-bold text-green-700">{summary.created}</p>
                <p className="text-[10px] text-green-600">Opprettet</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 text-center">
                <p className="text-lg font-bold text-blue-700">{summary.linked}</p>
                <p className="text-[10px] text-blue-600">Tilknyttet</p>
              </div>
              <div className="rounded-lg bg-gray-100 p-2 text-center">
                <p className="text-lg font-bold text-gray-600">{summary.skipped}</p>
                <p className="text-[10px] text-gray-500">Hoppet over</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2 text-center">
                <p className="text-lg font-bold text-red-700">{summary.errors}</p>
                <p className="text-[10px] text-red-600">Feil</p>
              </div>
            </div>

            {results && results.length > 0 && (
              <div className="max-h-60 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Rad</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Bedrift</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">E-post</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Detaljer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r, i) => {
                      const sc = statusConfig[r.status];
                      const Icon = sc.icon;
                      return (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-400">{r.row}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-900">{r.name}</td>
                          <td className="px-3 py-1.5 text-gray-500">{r.email ?? "—"}</td>
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex items-center gap-1 ${sc.color}`}>
                              <Icon className="h-3 w-3" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">{r.message ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setResults(null); setSummary(null); setFileName(null); }}
            >
              Importer flere
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
