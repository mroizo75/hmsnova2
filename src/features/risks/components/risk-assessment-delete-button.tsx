"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteRiskAssessment } from "@/server/actions/risk.actions";

interface RiskAssessmentDeleteButtonProps {
  assessmentId: string;
  assessmentTitle: string;
  disabled?: boolean;
}

export function RiskAssessmentDeleteButton({
  assessmentId,
  assessmentTitle,
  disabled = false,
}: RiskAssessmentDeleteButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = confirm(
      `Slette risikovurdering "${assessmentTitle}"?\n\nDette sletter også koblingen til risikopunktene i vurderingen.`
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteRiskAssessment(assessmentId);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Kunne ikke slette risikovurdering",
          description: result.error || "Ukjent feil",
        });
        return;
      }

      toast({
        title: "Risikovurdering slettet",
      });
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={disabled || isDeleting}
      title="Slett risikovurdering"
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
