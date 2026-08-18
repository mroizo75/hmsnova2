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

export default async function AnsattHjelpPage() {
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
          <p className="text-muted-foreground mt-1">
            Chat med HMS-representantene våre via ticketsystemet.
          </p>
        </div>
        <Button asChild>
          <Link href="/ansatt/hjelp/ny">
            <Plus className="mr-2 h-4 w-4" />
            Ny sak
          </Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium mb-4">Ingen saker ennå</p>
            <Button asChild>
              <Link href="/ansatt/hjelp/ny">Opprett sak</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/ansatt/hjelp/${ticket.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between gap-2">
                    <div>
                      <CardDescription className="font-mono text-xs">
                        {ticket.ticketNumber}
                      </CardDescription>
                      <CardTitle className="text-base mt-1">{ticket.subject}</CardTitle>
                    </div>
                    <Badge>{SUPPORT_STATUS_LABELS[ticket.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {SUPPORT_CATEGORY_LABELS[ticket.category]} ·{" "}
                  {format(new Date(ticket.lastMessageAt), "dd.MM.yyyy HH:mm", {
                    locale: nb,
                  })}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
