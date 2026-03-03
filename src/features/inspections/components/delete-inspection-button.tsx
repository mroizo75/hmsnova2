"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface DeleteInspectionButtonProps {
  inspectionId: string;
  inspectionTitle: string;
}

export function DeleteInspectionButton({
  inspectionId,
  inspectionTitle,
}: DeleteInspectionButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const response = await fetch(`/api/inspections/${inspectionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Kunne ikke slette vernerunden");
      }

      toast({
        title: "Vernerunde slettet",
        description: `"${inspectionTitle}" er permanent slettet.`,
      });

      setOpen(false);
      router.push("/dashboard/inspections");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Feil ved sletting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Slett
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slett vernerunde</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              Er du sikker på at du vil slette{" "}
              <strong>&ldquo;{inspectionTitle}&rdquo;</strong>?
            </span>
            <span className="block text-destructive font-medium">
              Dette vil permanent slette vernerunden og alle tilhørende funn.
              Handlingen kan ikke angres.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {loading ? "Sletter…" : "Ja, slett permanent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
