"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { linkSupplierAudit, linkSupplierIncident } from "@/server/actions/supplier.actions";

interface Option {
  id: string;
  title: string;
}

export function SupplierLinks({
  supplierId,
  audits,
  incidents,
}: {
  supplierId: string;
  audits: Option[];
  incidents: Option[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const link = (kind: "audit" | "incident", event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = String(new FormData(event.currentTarget).get("targetId") ?? "");
    if (!id) return;
    startTransition(async () => {
      const result =
        kind === "audit"
          ? await linkSupplierAudit(supplierId, id)
          : await linkSupplierIncident(supplierId, id);
      if (!result.success) {
        toast({ variant: "destructive", title: "Kunne ikke koble", description: result.error });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={(event) => link("audit", event)} className="space-y-2">
        <label className="text-sm font-medium" htmlFor="auditId">
          Koble leverandørrevisjon
        </label>
        <select
          id="auditId"
          name="targetId"
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">Velg revisjon</option>
          {audits.map((audit) => (
            <option key={audit.id} value={audit.id}>
              {audit.title}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={pending || audits.length === 0}>
          Koble revisjon
        </Button>
      </form>
      <form onSubmit={(event) => link("incident", event)} className="space-y-2">
        <label className="text-sm font-medium" htmlFor="incidentId">
          Koble kvalitetsavvik
        </label>
        <select
          id="incidentId"
          name="targetId"
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">Velg avvik</option>
          {incidents.map((incident) => (
            <option key={incident.id} value={incident.id}>
              {incident.title}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={pending || incidents.length === 0}>
          Koble avvik
        </Button>
      </form>
    </div>
  );
}
