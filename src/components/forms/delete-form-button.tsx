"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { deleteFormTemplate } from "@/server/actions/form.actions";
import { toast } from "sonner";

interface DeleteFormButtonProps {
  formId: string;
  formTitle: string;
  submissionCount: number;
  returnUrl?: string;
  /** Kun ikon (f.eks. i tabell) */
  compact?: boolean;
}

export function DeleteFormButton({
  formId,
  formTitle,
  submissionCount,
  returnUrl = "/dashboard/forms",
  compact = false,
}: DeleteFormButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmForce, setConfirmForce] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteFormTemplate(formId, confirmForce);

      if (!result.success && result.requiresConfirmation) {
        setConfirmForce(true);
        setIsDeleting(false);
        return;
      }

      if (!result.success) {
        toast.error(result.error || "Kunne ikke slette skjema");
        setIsDeleting(false);
        return;
      }

      toast.success(`Skjemaet "${formTitle}" er slettet`);
      setOpen(false);
      router.push(returnUrl);
      router.refresh();
    } catch {
      toast.error("En feil oppstod ved sletting");
      setIsDeleting(false);
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      setConfirmForce(false);
    }
    setOpen(value);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={compact ? "ghost" : "outline"}
          size={compact ? "sm" : "default"}
          title="Slett skjema"
          className={
            compact
              ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          }
        >
          <Trash2 className={`h-4 w-4 ${compact ? "" : "mr-2"}`} />
          {!compact ? "Slett" : null}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {confirmForce && <TriangleAlert className="h-5 w-5 text-destructive" />}
            {confirmForce ? "Er du helt sikker?" : "Slett skjema?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {confirmForce ? (
                <>
                  <p>
                    Skjemaet <strong>&quot;{formTitle}&quot;</strong> har{" "}
                    <strong>{submissionCount} utfyllinger</strong> som også vil bli
                    permanent slettet.
                  </p>
                  <p className="text-destructive font-medium">
                    Denne handlingen kan ikke angres.
                  </p>
                </>
              ) : (
                <p>
                  Er du sikker på at du vil slette skjemaet{" "}
                  <strong>&quot;{formTitle}&quot;</strong>?
                  {submissionCount > 0 && (
                    <> Skjemaet har {submissionCount} utfyllinger som også vil slettes.</>
                  )}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {confirmForce ? "Slett alt" : "Slett skjema"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
