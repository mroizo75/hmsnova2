"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { markPendingMeasuresInProgress } from "@/server/actions/measure.actions";

interface MarkMeasuresInProgressButtonProps {
  riskId?: string;
  assessmentId?: string;
  pendingCount?: number;
}

export function MarkMeasuresInProgressButton({
  riskId,
  assessmentId,
  pendingCount,
}: MarkMeasuresInProgressButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (pendingCount === 0) return null;

  async function handleClick() {
    setLoading(true);
    try {
      const result = await markPendingMeasuresInProgress({ riskId, assessmentId });
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Kunne ikke oppdatere",
          description: result.error,
        });
        return;
      }
      toast({
        title: result.count === 0 ? "Ingen tiltak å endre" : "Tiltakene er satt til pågår",
        description:
          result.count === 0
            ? "Alle tiltakene er allerede i gang eller fullført."
            : `${result.count} tiltak som sto som ikke startet, er nå pågår.`,
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="bg-transparent"
      onClick={() => void handleClick()}
      disabled={loading}
    >
      <Play className="mr-2 h-4 w-4" />
      {loading ? "Oppdaterer..." : "Sett alle til pågår"}
    </Button>
  );
}
