import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSupportTicketForCustomer } from "@/server/actions/support.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/features/support/lib/labels";
import { SupportTicketThread } from "@/features/support/components/support-ticket-thread";

export const dynamic = "force-dynamic";

type TicketData = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: keyof typeof SUPPORT_CATEGORY_LABELS;
  priority: keyof typeof SUPPORT_PRIORITY_LABELS;
  status: keyof typeof SUPPORT_STATUS_LABELS;
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

export default async function AnsattHjelpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getSupportTicketForCustomer(id);
  if (!result.success) notFound();
  const ticket = result.data as TicketData;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link href="/ansatt/hjelp">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Alle saker
        </Link>
      </Button>
      <div className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</p>
        <h1 className="text-xl font-bold">{ticket.subject}</h1>
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
        mode="customer"
        assignedToName={ticket.assignedTo?.name}
      />
    </div>
  );
}
