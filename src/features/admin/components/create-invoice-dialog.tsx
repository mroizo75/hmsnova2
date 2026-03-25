"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createManualInvoice } from "@/server/actions/invoice.actions";
import { Loader2, Plus } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
}

interface CreateInvoiceDialogProps {
  tenants: Tenant[];
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Ikke sendt" },
  { value: "SENT", label: "Sendt" },
  { value: "PAID", label: "Betalt" },
] as const;

export function CreateInvoiceDialog({ tenants }: CreateInvoiceDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tenantId, setTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState<string>("PENDING");

  function resetForm() {
    setTenantId("");
    setAmount("");
    setDueDate("");
    setInvoiceNumber("");
    setDescription("");
    setPeriod("");
    setStatus("PENDING");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!tenantId || !amount || !dueDate) {
      toast({
        variant: "destructive",
        title: "Manglende felter",
        description: "Bedrift, beløp og forfallsdato er påkrevd",
      });
      return;
    }

    setLoading(true);
    const result = await createManualInvoice({
      tenantId,
      amount: parseFloat(amount),
      dueDate,
      invoiceNumber: invoiceNumber || undefined,
      description: description || undefined,
      period: period || undefined,
      status: status as "PENDING" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED",
    });

    if (result.success) {
      toast({ title: "Faktura opprettet" });
      setOpen(false);
      resetForm();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ny faktura
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Opprett faktura</DialogTitle>
          <DialogDescription>
            Opprett en manuell faktura for en bedrift
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant">Bedrift *</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg bedrift" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Beløp (kr) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Forfallsdato *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Fakturanummer</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="F.eks. 2026-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Input
                id="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="F.eks. 2026-03"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="F.eks. HMS Nova Professional - Kvartalsabonnement"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opprett faktura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
