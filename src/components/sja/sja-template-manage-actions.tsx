"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Loader2, LockKeyhole, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { duplicateSjaTemplate } from "@/server/actions/sja.actions";
import { SjaDeleteTemplateButton } from "@/components/sja/sja-delete-template-button";

interface SjaTemplateManageActionsProps {
  templateId: string;
  templateName: string;
  isLockedByGroup: boolean;
}

export function SjaTemplateManageActions({
  templateId,
  templateName,
  isLockedByGroup,
}: SjaTemplateManageActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const result = await duplicateSjaTemplate(templateId);
      if (!result.success) throw new Error(result.error);
      toast({ title: "Malen er kopiert", description: "Kopien kan nå tilpasses." });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Kunne ikke kopiere malen",
        description: error instanceof Error ? error.message : "Ukjent feil",
      });
    } finally {
      setIsDuplicating(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {isLockedByGroup ? (
        <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" /> Konsernstyrt
        </span>
      ) : (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/sja/maler/${templateId}/rediger`}>
            <Pencil className="mr-1 h-4 w-4" /> Rediger
          </Link>
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={handleDuplicate} disabled={isDuplicating}>
        {isDuplicating ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Copy className="mr-1 h-4 w-4" />
        )}
        Kopier
      </Button>
      {!isLockedByGroup && (
        <SjaDeleteTemplateButton templateId={templateId} templateName={templateName} />
      )}
    </div>
  );
}
