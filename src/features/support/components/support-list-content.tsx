"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/features/support/lib/labels";
import { fetchSupportTickets } from "@/server/queries/support.queries";

type SupportTicketsData = Awaited<ReturnType<typeof fetchSupportTickets>>;

interface SupportListContentProps {
  initialData: SupportTicketsData;
}

function statusVariant(status: string) {
  switch (status) {
    case "OPEN":
      return "default" as const;
    case "IN_PROGRESS":
      return "secondary" as const;
    case "WAITING_CUSTOMER":
      return "outline" as const;
    case "RESOLVED":
      return "secondary" as const;
    case "CLOSED":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

export function SupportListContent({ initialData }: SupportListContentProps) {
  const { data } = useQuery({
    queryKey: ["support"],
    queryFn: () => fetchSupportTickets(),
    initialData,
  });

  const { success, tickets } = data;

  if (!success) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Kunne ikke laste support-saker.
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Ingen saker ennå</p>
          <p className="text-sm text-muted-foreground mb-6">
            Opprett en sak for å chatte med en HMS-representant.
          </p>
          <Button asChild>
            <Link href="/dashboard/support/ny">Opprett første sak</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {tickets.map((ticket: any) => (
        <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`}>
          <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardDescription className="font-mono text-xs">
                    {ticket.ticketNumber}
                  </CardDescription>
                  <CardTitle className="text-base mt-1">{ticket.subject}</CardTitle>
                </div>
                <Badge variant={statusVariant(ticket.status)}>
                  {SUPPORT_STATUS_LABELS[ticket.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>{SUPPORT_CATEGORY_LABELS[ticket.category]}</span>
              <span>{ticket.messageCount} meldinger</span>
              <span>
                Sist aktivitet{" "}
                {format(new Date(ticket.lastMessageAt), "dd.MM.yyyy HH:mm", {
                  locale: nb,
                })}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
