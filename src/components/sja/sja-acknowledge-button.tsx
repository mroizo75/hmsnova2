"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { acknowledgeSjaParticipation } from "@/server/actions/sja.actions";

interface SjaAcknowledgeButtonProps {
  analysisId: string;
}

export function SjaAcknowledgeButton({ analysisId }: SjaAcknowledgeButtonProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAcknowledge() {
    setIsSubmitting(true);
    try {
      const result = await acknowledgeSjaParticipation(analysisId);
      if (!result.success) throw new Error(result.error);
      toast({
        title: "SJA bekreftet",
        description: "Identitet, tidspunkt og dokumentversjon er registrert.",
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunne ikke bekrefte SJA",
        description: error instanceof Error ? error.message : "Ukjent feil",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button onClick={handleAcknowledge} disabled={isSubmitting} className="w-full">
      {isSubmitting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      )}
      Jeg har lest og forstått SJA-en
    </Button>
  );
}
