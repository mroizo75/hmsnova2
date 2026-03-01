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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { deleteSjaTemplate } from "@/server/actions/sja.actions";

interface SjaDeleteTemplateButtonProps {
  templateId: string;
  templateName: string;
}

export function SjaDeleteTemplateButton({ templateId, templateName }: SjaDeleteTemplateButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteSjaTemplate(templateId);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Mal slettet",
        description: `Malen "${templateName}" er fjernet.`,
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke slette malen.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett SJA-mal?</AlertDialogTitle>
          <AlertDialogDescription>
            Er du sikker på at du vil slette malen &quot;{templateName}&quot;? Malen vil ikke lenger
            være tilgjengelig for ansatte. Eksisterende SJA-er som er opprettet fra denne malen
            påvirkes ikke.
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
            Slett mal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
