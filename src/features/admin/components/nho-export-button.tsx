"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_NHO_ASSOCIATION_ID,
  NHO_ASSOCIATIONS,
} from "@/lib/nho-associations";

export function NhoExportButton() {
  const [loading, setLoading] = useState(false);
  const [associationId, setAssociationId] = useState(DEFAULT_NHO_ASSOCIATION_ID);
  const selected = NHO_ASSOCIATIONS.find((item) => item.id === associationId);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/hms-export?association=${encodeURIComponent(associationId)}`,
      );
      if (!res.ok) throw new Error("Eksport feilet");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match?.[1] || `${selected?.filenamePrefix ?? "NHO_HMS"}_rapport.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Select value={associationId} onValueChange={setAssociationId}>
          <SelectTrigger className="w-[200px] bg-transparent" aria-label="Velg forening">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NHO_ASSOCIATIONS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleExport} disabled={loading} variant="outline">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Last ned rapport
        </Button>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Anonymisert bransjestatistikk uten bedriftsnavn eller org.nr. Kun{" "}
        {selected?.label ?? "valgt forening"}.
      </p>
    </div>
  );
}
