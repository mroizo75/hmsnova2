"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
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
  const [checked, setChecked] = useState(included);
  const [loading, setLoading] = useState(false);

  async function handleToggle(next: boolean) {
    setChecked(next);
    setLoading(true);
    const result = await toggleAiIncludedInAgreement(tenantId, next);
    setLoading(false);

    if (result.success) {
      toast({
        title: next ? "AI inkludert" : "AI-inkludering fjernet",
        description: next
          ? `${tenantName}: AI uten ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd tillegg.`
          : `${tenantName}: AI er slått av.`,
      });
      router.refresh();
    } else {
      setChecked(!next);
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre",
        description: result.error || "Noe gikk galt",
      });
    }
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      <Switch
        aria-label={`Inkluder AI for ${tenantName}`}
        checked={checked}
        disabled={loading}
        onCheckedChange={(next) => {
          void handleToggle(next);
        }}
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {checked ? "Inkludert" : "—"}
      </span>
    </div>
  );
}
