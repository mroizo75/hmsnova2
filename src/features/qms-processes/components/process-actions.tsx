"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteQmsProcess, seedQmsProcessStarters } from "@/server/actions/qms-process.actions";

export function SeedProcessesButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await seedQmsProcessStarters();
            if ("error" in result) {
              setError(result.error);
              toast({ variant: "destructive", title: "Kunne ikke legge inn forslag", description: result.error });
              return;
            }
            toast({
              title: result.created === 0 ? "Forslagene ligger allerede inne" : `${result.created} prosesser er lagt inn som utkast`,
            });
            router.refresh();
          });
        }}
      >
        {pending ? "Legger inn…" : "Legg inn forslag til prosesser"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function DeleteProcessButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Slette prosessen? Koblinger til andre prosesser fjernes.")) return;
        startTransition(async () => {
          const result = await deleteQmsProcess(id);
          if ("error" in result) {
            toast({ variant: "destructive", title: "Kunne ikke slette", description: result.error });
            return;
          }
          router.push("/dashboard/prosesser");
          router.refresh();
        });
      }}
    >
      {pending ? "Sletter…" : "Slett"}
    </Button>
  );
}
