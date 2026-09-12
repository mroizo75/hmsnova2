"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmPowerOfficeImport, previewPowerOfficeImport } from "@/server/actions/hr-import.actions";
import type { PowerOfficeRow } from "@/lib/hr/poweroffice";

type PreviewRow = {
  rowNumber: number;
  name: string;
  email: string | null;
  employeeNumber: string | null;
  department: string | null;
  status: "matched" | "ambiguous" | "unmatched";
  matchedUserId: string | null;
  reason: string;
  row: PowerOfficeRow;
};

export function PowerOfficeImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await previewPowerOfficeImport(formData);
      if (result.success === false) {
        setMessage(result.error);
        return;
      }
      setPreview(result.data.rows as PreviewRow[]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setLoading(true);
    try {
      const result = await confirmPowerOfficeImport({
        rows: preview.map((item) => ({
          row: item.row,
          matchedUserId: item.matchedUserId,
          skip: item.status !== "matched",
        })),
      });
      if (result.success === false) {
        setMessage(result.error);
        return;
      }
      setMessage(`Oppdatert ${result.updated} ansatte. Hoppet over ${result.skipped}.`);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer fra Power Office</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Last opp ansatt- og pårørendeliste uten omgjøring. Matcher mot eksisterende brukere. Oppretter ikke innlogging.
        </p>
        <input
          type="file"
          accept=".xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handlePreview} disabled={!file || loading}>
            Forhåndsvis
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!preview || loading}>
            Bekreft import
          </Button>
        </div>
        {message && <p className="text-sm">{message}</p>}
        {preview && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Rad</th>
                  <th className="p-2">Navn</th>
                  <th className="p-2">E-post</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.rowNumber} className="border-t">
                    <td className="p-2">{row.rowNumber}</td>
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.email ?? "—"}</td>
                    <td className="p-2">
                      {row.status === "matched" ? "Koblet" : row.status === "ambiguous" ? "Usikker" : "Ukjent"}{" "}
                      ({row.reason})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
