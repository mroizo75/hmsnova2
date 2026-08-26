"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/features/support/lib/labels";
import { SupportTicketThread } from "@/features/support/components/support-ticket-thread";
import { fetchSupportTicket } from "@/server/queries/support.queries";

type TicketData = NonNullable<Awaited<ReturnType<typeof fetchSupportTicket>>>;

interface SupportDetailContentProps {
  initialData: TicketData;
  ticketId: string;
}

export function SupportDetailContent({ initialData, ticketId }: SupportDetailContentProps) {
  const { data: ticket } = useQuery({
    queryKey: ["support", ticketId],
    queryFn: () => fetchSupportTicket(ticketId),
    initialData,
  });

  if (!ticket) return null;

  return (
    <>
      <div className="space-y-2">
        <p className="font-mono text-xs text-muted-foreground">{ticket.ticketNumber}</p>
        <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge>{SUPPORT_STATUS_LABELS[ticket.status as keyof typeof SUPPORT_STATUS_LABELS]}</Badge>
          <Badge variant="outline">{SUPPORT_CATEGORY_LABELS[ticket.category as keyof typeof SUPPORT_CATEGORY_LABELS]}</Badge>
          <Badge variant="secondary">{SUPPORT_PRIORITY_LABELS[ticket.priority as keyof typeof SUPPORT_PRIORITY_LABELS]}</Badge>
        </div>
      </div>

      <SupportTicketThread
        ticketId={ticket.id}
        status={ticket.status}
        messages={ticket.messages}
        mode="customer"
        assignedToName={ticket.assignedTo?.name}
      />
    </>
  );
}
