import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Headphones, Plus, MessageSquare } from "lucide-react";

import { listMySupportTickets } from "@/server/actions/support.actions";
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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hjelp og support | HMS Nova",
  description: "Chat og ticketsystem med HMS-representantene våre",
};

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

export default async function SupportPage() {
  const result = await listMySupportTickets();
  const tickets = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Headphones className="h-7 w-7 text-primary" />
            Hjelp og support
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            HMS-representantene våre er tilgjengelige via chat og ticketsystem.
            Still spørsmål om systemet, HMS-faglige forhold, faktura eller tekniske
            problemer – vi svarer her i tråden.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/support/ny">
            <Plus className="mr-2 h-4 w-4" />
            Ny sak
          </Link>
        </Button>
      </div>

      {!result.success ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Kunne ikke laste support-saker.
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
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
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
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
      )}
    </div>
  );
}
