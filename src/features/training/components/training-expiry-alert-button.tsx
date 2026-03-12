"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendHealthcareTrainingExpiryAlerts } from "@/server/actions/training.actions";

export function TrainingExpiryAlertButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSendAlerts() {
    setLoading(true);
    const result = await sendHealthcareTrainingExpiryAlerts();
    setLoading(false);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Kunne ikke sende varsler",
        description: result.error || "Ukjent feil",
      });
      return;
    }

    const sent = result.data?.sent ?? 0;
    toast({
      title: "Varsler sendt",
      description:
        sent > 0
          ? `${sent} helsevarsler om utlopende kompetanse er sendt.`
          : "Ingen nye varsler var nodvendige akkurat na.",
    });
  }

  return (
    <Button type="button" variant="outline" className="gap-2" onClick={handleSendAlerts} disabled={loading}>
      <BellRing className="h-4 w-4" />
      {loading ? "Sender varsler..." : "Send kompetansevarsler"}
    </Button>
  );
}

