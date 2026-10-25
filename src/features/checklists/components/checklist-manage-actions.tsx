"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { archiveChecklist, deleteDraftChecklist } from "@/server/actions/checklist.actions";

export function ChecklistManageActions({
  id,
  status,
}: {
  id: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  if (status === "ARCHIVED") return null;

  function archive() {
    if (!window.confirm("Arkivert sjekkliste kan ikke fylles ut. Innsendingene blir liggende.")) return;
    startTransition(async () => {
      const result = await archiveChecklist(id);
      if (!result.success) {
        toast({ title: "Kunne ikke arkivere", description: result.error, variant: "destructive" });
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Kladder slettes permanent.")) return;
    startTransition(async () => {
      const result = await deleteDraftChecklist(id);
      if (!result.success) {
        toast({ title: "Kunne ikke slette", description: result.error, variant: "destructive" });
        return;
      }
      router.push("/dashboard/sjekklister");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <Button type="button" variant="outline" className="bg-transparent" disabled={pending} onClick={remove}>
          Slett kladd
        </Button>
      )}
      <Button type="button" variant="outline" className="bg-transparent" disabled={pending} onClick={archive}>
        Arkiver
      </Button>
    </div>
  );
}
