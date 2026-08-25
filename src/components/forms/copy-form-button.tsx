"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { copyGlobalFormTemplate } from "@/server/actions/form.actions";
import { toast } from "sonner";

interface CopyFormButtonProps {
  formId: string;
  formTitle: string;
}

export function CopyFormButton({ formId, formTitle }: CopyFormButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCopy = async () => {
    setIsLoading(true);

    try {
      const result = await copyGlobalFormTemplate(formId);

      if (result.success && result.data) {
        toast.success(`Kopi av "${formTitle}" er opprettet!`);
        // Redirect til den nye kopien for redigering
        router.push(`/dashboard/forms/${result.data.id}/edit`);
      } else {
        toast.error(result.error || "Kunne ikke kopiere skjema");
      }
    } catch (error) {
      toast.error("En feil oppstod ved kopiering");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Kopierer...
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Lag kopi
        </>
      )}
    </Button>
  );
}
