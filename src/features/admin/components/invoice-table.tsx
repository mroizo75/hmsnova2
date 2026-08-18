"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteInvoice } from "@/server/actions/invoice.actions";
import { InvoiceStatusSelect } from "./invoice-status-select";
import { MoreHorizontal, Trash2, Check } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";

interface InvoiceWithTenant {
  id: string;
  tenantId: string;
  invoiceNumber: string | null;
  amount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: InvoiceStatus;
  period: string | null;
  description: string | null;
  fikenInvoiceId: string | null;
  createdAt: Date;
  tenant: {
    name: string;
    contactEmail: string | null;
    invoiceEmail: string | null;
  };
}

type FilterTab = "ALL" | InvoiceStatus;

const TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "Alle" },
  { value: "PENDING", label: "Ikke sendt" },
  { value: "SENT", label: "Sendt" },
  { value: "OVERDUE", label: "Forfalt" },
  { value: "PAID", label: "Betalt" },
  { value: "CANCELLED", label: "Kansellert" },
];

function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function DueDateCell({ dueDate, status }: { dueDate: Date; status: InvoiceStatus }) {
  const days = getDaysUntilDue(dueDate);
  const formatted = new Date(dueDate).toLocaleDateString("no-NO");

  if (status === "PAID" || status === "CANCELLED") {
    return <span className="text-muted-foreground">{formatted}</span>;
  }

  if (days < 0) {
    return (
      <span className="text-destructive font-medium">
        {formatted}
        <span className="block text-xs">{Math.abs(days)} dager over forfall</span>
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="text-orange-600 font-medium">
        {formatted}
        <span className="block text-xs">{days} dager igjen</span>
      </span>
    );
  }

  return <span>{formatted}</span>;
}

interface InvoiceTableProps {
  invoices: InvoiceWithTenant[];
  exportedInvoiceIds?: string[];
}

export function InvoiceTable({ invoices, exportedInvoiceIds = [] }: InvoiceTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = activeTab === "ALL"
    ? invoices
    : invoices.filter((inv) => inv.status === activeTab);

  const counts: Record<string, number> = {
    ALL: invoices.length,
    PENDING: invoices.filter((i) => i.status === "PENDING").length,
    SENT: invoices.filter((i) => i.status === "SENT").length,
    OVERDUE: invoices.filter((i) => i.status === "OVERDUE").length,
    PAID: invoices.filter((i) => i.status === "PAID").length,
    CANCELLED: invoices.filter((i) => i.status === "CANCELLED").length,
  };

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteInvoice(id);
    if (result.success) {
      toast({ title: "Faktura slettet" });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Feil",
        description: result.error,
      });
    }
    setDeletingId(null);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Fakturaer ({filtered.length})</CardTitle>
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
                {counts[tab.value] > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {counts[tab.value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Ingen fakturaer i denne kategorien
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fakturanr</TableHead>
                <TableHead>Bedrift</TableHead>
                <TableHead>Beskrivelse</TableHead>
                <TableHead className="text-right">Beløp</TableHead>
                <TableHead>Forfallsdato</TableHead>
                <TableHead>Betalt dato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Eksport</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className={
                    invoice.status === "OVERDUE"
                      ? "bg-destructive/5"
                      : invoice.status === "PAID"
                      ? "bg-green-50/50 dark:bg-green-950/10"
                      : undefined
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {invoice.invoiceNumber || "-"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{invoice.tenant.name}</span>
                      {(invoice.tenant.invoiceEmail || invoice.tenant.contactEmail) && (
                        <span className="block text-xs text-muted-foreground">
                          {invoice.tenant.invoiceEmail || invoice.tenant.contactEmail}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {invoice.description || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {invoice.amount.toLocaleString("no-NO")} kr
                  </TableCell>
                  <TableCell>
                    <DueDateCell dueDate={invoice.dueDate} status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {invoice.paidDate
                      ? new Date(invoice.paidDate).toLocaleDateString("no-NO")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusSelect
                      invoiceId={invoice.id}
                      currentStatus={invoice.status}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invoice.period || "-"}
                  </TableCell>
                  <TableCell>
                    {exportedInvoiceIds.includes(invoice.id) && (
                      <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50 text-[10px]">
                        <Check className="h-3 w-3" />
                        Lastet ned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={!!invoice.fikenInvoiceId || deletingId === invoice.id}
                          onClick={() => handleDelete(invoice.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {invoice.fikenInvoiceId ? "Synkronisert (kan ikke slettes)" : "Slett faktura"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
