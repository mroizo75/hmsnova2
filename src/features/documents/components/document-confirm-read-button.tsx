"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { confirmDocumentRead } from "@/server/actions/document.actions";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, BookCheck } from "lucide-react";

interface DocumentConfirmReadButtonProps {
  documentId: string;
  initialConfirmed: boolean;
  initialConfirmedAt: string | null;
  labels: {
    confirm: string;
    confirmed: string;
    confirmedAt: string;
  };
}

export function DocumentConfirmReadButton({
  documentId,
  initialConfirmed,
  initialConfirmedAt,
  labels,
}: DocumentConfirmReadButtonProps) {
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [confirmedAt, setConfirmedAt] = useState(initialConfirmedAt);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmDocumentRead(documentId);
      if (result.success) {
        setConfirmed(true);
        setConfirmedAt(new Date().toISOString());
        toast({ title: labels.confirmed });
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  if (confirmed) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1.5 px-3 py-1.5 text-sm">
        <CheckCircle2 className="h-4 w-4" />
        {labels.confirmed}
        {confirmedAt && (
          <span className="text-green-600/80">
            · {labels.confirmedAt} {new Date(confirmedAt).toLocaleDateString("nb-NO")}
          </span>
        )}
      </Badge>
    );
  }

  return (
    <Button size="lg" onClick={handleConfirm} disabled={isPending} className="w-full md:w-auto">
      <BookCheck className="mr-2 h-5 w-5" />
      {labels.confirm}
    </Button>
  );
}
