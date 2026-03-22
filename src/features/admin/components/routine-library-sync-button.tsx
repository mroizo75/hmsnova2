"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { syncRoutineLibraryNow } from "@/server/actions/routine-library.actions";

export function RoutineLibrarySyncButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncRoutineLibraryNow();
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Kunne ikke synkronisere",
          description: result.error || "Ukjent feil",
        });
        return;
      }

      toast({
        title: "Rutinebibliotek synkronisert",
        description: `${result.data.created} opprettet, ${result.data.updated} oppdatert.`,
      });
      router.refresh();
    });
  };

  return (
    <Button onClick={handleSync} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Synkroniserer...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Synk rutinebibliotek nå
        </>
      )}
    </Button>
  );
}
