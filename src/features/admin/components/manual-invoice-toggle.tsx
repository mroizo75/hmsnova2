"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { setManualInvoiced } from "@/server/actions/tenant.actions";
import { useToast } from "@/hooks/use-toast";

interface ManualInvoiceToggleProps {
  tenantId: string;
  tenantName: string;
  invoiced: boolean;
  invoicedAt?: Date | string | null;
}

export function ManualInvoiceToggle({
  tenantId,
  tenantName,
  invoiced,
  invoicedAt,
}: ManualInvoiceToggleProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [checked, setChecked] = useState(invoiced);
  const [loading, setLoading] = useState(false);

  async function handleToggle(next: boolean) {
    setChecked(next);
    setLoading(true);
    const result = await setManualInvoiced(tenantId, next);
    setLoading(false);

    if (result.success) {
      toast({
        title: next ? "Markert som fakturert" : "Markert som ikke fakturert",
        description: tenantName,
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

  const when =
    checked && invoicedAt
      ? new Date(invoicedAt).toLocaleDateString("nb-NO")
      : null;

  return (
    <div
      className="flex items-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      <Checkbox
        aria-label={`Fakturert: ${tenantName}`}
        checked={checked}
        disabled={loading}
        onCheckedChange={(value) => {
          void handleToggle(value === true);
        }}
      />
      <span className="text-xs whitespace-nowrap">
        {checked ? "Fakturert" : "Ikke fakturert"}
        {when ? ` ${when}` : ""}
      </span>
    </div>
  );
}
