"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toggleAiIncludedInAgreement } from "@/server/actions/tenant.actions";
import { useToast } from "@/hooks/use-toast";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";

interface AdminAiIncludedSwitchProps {
  tenantId: string;
  tenantName: string;
  included: boolean;
}

export function AdminAiIncludedSwitch({
  tenantId,
  tenantName,
  included,
}: AdminAiIncludedSwitchProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    const next = !included;
    const result = await toggleAiIncludedInAgreement(tenantId, next);
    setLoading(false);

    if (result.success) {
      setOpen(false);
      toast({
        title: next ? "AI lagt inn i avtalen" : "AI tatt ut av avtalen",
        description: next
          ? `${tenantName}: AI faktureres ikke. Tillegget på ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd faller bort.`
          : `${tenantName}: AI er slått av. Skrur de det på igjen, skal det faktureres.`,
      });
      router.refresh();
      return;
    }

    toast({
      variant: "destructive",
      title: "Kunne ikke lagre",
      description: result.error || "Noe gikk galt",
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="bg-transparent"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {included ? "Ta ut av avtale" : "Legg i avtale"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {included ? "Ta AI ut av avtalen?" : "Legg AI inn i avtalen uten tillegg?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {included
                ? `${tenantName} har AI inkludert uten ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd. Tar du det ut, slås AI av. Skrur bedriften det på igjen selv, skal det faktureres.`
                : `${tenantName} skal ikke faktureres ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd + mva for AI etter dette. Overstyringen er ikke det samme som at kunden har skrudd på AI selv.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
            <Button type="button" disabled={loading} onClick={() => void confirm()}>
              {included ? "Ta ut av avtale" : "Legg i avtale"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
