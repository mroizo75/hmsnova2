import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSupportTicketForAdmin } from "@/server/actions/support.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/features/support/lib/labels";
import { SupportTicketThread } from "@/features/support/components/support-ticket-thread";

export const dynamic = "force-dynamic";

type AdminTicketDetail = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: keyof typeof SUPPORT_CATEGORY_LABELS;
  priority: keyof typeof SUPPORT_PRIORITY_LABELS;
  status: keyof typeof SUPPORT_STATUS_LABELS;
  tenant: { name: string; orgNumber: string | null };
  createdBy: { name: string | null; email: string };
  assignedTo: { name: string | null } | null;
  messages: Array<{
    id: string;
    body: string;
    senderType: "CUSTOMER" | "SUPPORT" | "SYSTEM";
    isInternal: boolean;
    createdAt: Date;
    sender: { id: string; name: string | null; email: string };
  }>;
};

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSupportTicketForAdmin(id);

  if (!result.success) {
    notFound();
  }

  const ticket = result.data as AdminTicketDetail;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/admin/support">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til inbox
        </Link>
      </Button>

      <div className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground">
          {ticket.ticketNumber} · {ticket.tenant.name}
          {ticket.tenant.orgNumber ? ` · Org.nr ${ticket.tenant.orgNumber}` : ""}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">
          Fra {ticket.createdBy.name || ticket.createdBy.email} ({ticket.createdBy.email})
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge>{SUPPORT_STATUS_LABELS[ticket.status]}</Badge>
          <Badge variant="outline">{SUPPORT_CATEGORY_LABELS[ticket.category]}</Badge>
          <Badge variant="secondary">{SUPPORT_PRIORITY_LABELS[ticket.priority]}</Badge>
        </div>
      </div>

      <SupportTicketThread
        ticketId={ticket.id}
        status={ticket.status}
        messages={ticket.messages}
        mode="staff"
        assignedToName={ticket.assignedTo?.name}
      />
    </div>
  );
}
