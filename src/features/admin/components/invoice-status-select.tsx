"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateInvoiceStatus } from "@/server/actions/invoice.actions";
import type { InvoiceStatus } from "@prisma/client";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  PENDING: { label: "Ikke sendt", className: "text-muted-foreground" },
  SENT: { label: "Sendt", className: "text-blue-600" },
  PAID: { label: "Betalt", className: "text-green-600" },
  OVERDUE: { label: "Forfalt", className: "text-destructive" },
  CANCELLED: { label: "Kansellert", className: "text-muted-foreground line-through" },
};

interface InvoiceStatusSelectProps {
  invoiceId: string;
  currentStatus: InvoiceStatus;
}

export function InvoiceStatusSelect({ invoiceId, currentStatus }: InvoiceStatusSelectProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleChange(newStatus: string) {
    if (newStatus === currentStatus) return;
    setLoading(true);

    const result = await updateInvoiceStatus(invoiceId, newStatus as InvoiceStatus);

    if (result.success) {
      toast({ title: `Status endret til ${STATUS_CONFIG[newStatus as InvoiceStatus].label}` });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error,
      });
    }
    setLoading(false);
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className={`w-[140px] h-8 text-xs font-medium ${STATUS_CONFIG[currentStatus].className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(STATUS_CONFIG) as [InvoiceStatus, { label: string; className: string }][]).map(
          ([value, config]) => (
            <SelectItem key={value} value={value} className={`text-xs ${config.className}`}>
              {config.label}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}
