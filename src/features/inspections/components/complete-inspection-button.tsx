"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CompleteInspectionButtonProps {
  inspectionId: string;
  findingsCount: number;
}

export function CompleteInspectionButton({
  inspectionId,
  findingsCount,
}: CompleteInspectionButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const completeInspection = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          completedDate: new Date().toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke fullføre vernerunde");
      }

      toast({
        title: findingsCount > 0 ? "Vernerunde fullført" : "Vernerunde fullført uten funn",
        description:
          findingsCount > 0
            ? "Status er satt til fullført."
            : "Status er satt til fullført. Ingen funn ble registrert.",
      });
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke fullføre vernerunden.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button onClick={completeInspection} disabled={saving} variant="outline">
      {saving
        ? "Lagrer..."
        : findingsCount > 0
        ? "Fullfør vernerunde"
        : "Ingen funn - fullfør vernerunde"}
    </Button>
  );
}
