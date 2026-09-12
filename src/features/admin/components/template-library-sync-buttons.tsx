"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { syncRoutineLibraryNow } from "@/server/actions/routine-library.actions";
import { syncFormLibraryNow } from "@/server/actions/form-library.actions";
import { seedHrDocumentTemplates } from "@/server/actions/template-library.actions";

function SyncButton({
  label,
  onSync,
}: {
  label: string;
  onSync: () => Promise<{ success: boolean; data?: { created: number; updated: number }; error?: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      const result = await onSync();
      if (!result.success) {
        toast({ variant: "destructive", title: "Feil", description: (result as { error?: string }).error ?? "Ukjent feil" });
        return;
      }
      const d = result.data as { created: number; updated: number };
      toast({ title: `${label} synkronisert`, description: `${d.created} opprettet, ${d.updated} oppdatert.` });
      router.refresh();
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
      {isPending ? "Synker..." : "Synk"}
    </Button>
  );
}

export function SyncRoutinesButton() {
  return <SyncButton label="Rutiner" onSync={syncRoutineLibraryNow} />;
}

export function SyncFormsButton() {
  return <SyncButton label="Skjema" onSync={syncFormLibraryNow} />;
}

export function SyncHrDocumentsButton() {
  return <SyncButton label="HR-dokumenter" onSync={seedHrDocumentTemplates} />;
}

export function SyncAllButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSyncAll = () => {
    startTransition(async () => {
      const results = await Promise.allSettled([
        syncRoutineLibraryNow(),
        syncFormLibraryNow(),
        seedHrDocumentTemplates(),
      ]);
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success));
      if (failed.length > 0) {
        toast({ variant: "destructive", title: "Delvis feil", description: `${failed.length} synk feilet` });
      } else {
        toast({ title: "Alt synkronisert", description: "Rutiner, skjema og HR-dokumenter er oppdatert." });
      }
      router.refresh();
    });
  };

  return (
    <Button onClick={handleSyncAll} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
      {isPending ? "Synkroniserer alt..." : "Synk alt"}
    </Button>
  );
}
