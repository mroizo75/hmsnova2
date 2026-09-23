"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  APPROVAL_VALIDITY_LABELS,
  equipmentCategoryLabel,
  formatApprovalDate,
  getApprovalValidity,
  type ApprovalValidity,
} from "@/lib/equipment-approval";
import type { EquipmentListItem } from "@/server/queries/equipment-approval.queries";

const VALIDITY_CLASS: Record<ApprovalValidity, string> = {
  GYLDIG: "border-green-300 bg-green-100 text-green-900",
  UTLOPER: "border-amber-300 bg-amber-100 text-amber-950",
  UTLOPT: "border-red-300 bg-red-100 text-red-900",
  UTTATT: "border-slate-300 bg-slate-100 text-slate-800",
};

const FILTERS: Array<{ id: "ALLE" | ApprovalValidity; label: string }> = [
  { id: "ALLE", label: "Alle" },
  { id: "UTLOPT", label: "Utløpt" },
  { id: "UTLOPER", label: "Utløper snart" },
  { id: "GYLDIG", label: "Gyldig" },
  { id: "UTTATT", label: "Tatt ut av bruk" },
];

export function EquipmentApprovalList({
  items,
  canEdit,
}: {
  items: EquipmentListItem[];
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALLE");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const validity = getApprovalValidity(item);
      if (filter !== "ALLE" && validity !== filter) return false;
      if (!needle) return true;
      return [item.name, item.supplierName, item.approvalBody, item.serialNumber, item.location]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [filter, items, query]);

  const expired = items.filter((item) => getApprovalValidity(item) === "UTLOPT").length;
  const expiring = items.filter((item) => getApprovalValidity(item) === "UTLOPER").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Søk på navn, leverandør eller serienummer"
          className="sm:max-w-sm"
        />
        {canEdit && (
          <Button asChild>
            <Link href="/dashboard/utstyr/ny">
              <Plus className="mr-2 h-4 w-4" />
              Nytt utstyr
            </Link>
          </Button>
        )}
      </div>

      {(expired > 0 || expiring > 0) && (
        <p className="text-sm text-muted-foreground">
          {expired > 0 && <span className="font-medium text-red-700">{expired} utløpt. </span>}
          {expiring > 0 && <span className="font-medium text-amber-800">{expiring} utløper innen 60 dager.</span>}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={filter === option.id ? "default" : "outline"}
            className={filter === option.id ? undefined : "bg-transparent"}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Wrench className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "Ingen utstyr er registrert ennå. Legg inn løftere, trykkutstyr og annet som har godkjenning."
                : "Ingen treff for filteret."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Utstyr</th>
                <th className="px-4 py-3 font-medium">Leverandør</th>
                <th className="px-4 py-3 font-medium">Godkjent av</th>
                <th className="px-4 py-3 font-medium">Gyldig</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const validity = getApprovalValidity(item);
                return (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/utstyr/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {equipmentCategoryLabel(item.category)}
                        {item.serialNumber ? ` · ${item.serialNumber}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">{item.supplierName}</td>
                    <td className="px-4 py-3">{item.approvalBody}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatApprovalDate(item.validFrom)} – {formatApprovalDate(item.validTo)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={VALIDITY_CLASS[validity]}>
                        {APPROVAL_VALIDITY_LABELS[validity]}
                      </Badge>
                      {item.documentCount === 0 && validity !== "UTTATT" && (
                        <p className="mt-1 text-xs text-amber-800">Mangler dokument</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
