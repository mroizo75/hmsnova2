import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Headphones, MessageSquare } from "lucide-react";

import { listAdminSupportTickets } from "@/server/actions/support.actions";
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
  title: "Support-inbox | HMS Nova Admin",
};

type AdminTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: keyof typeof SUPPORT_CATEGORY_LABELS;
  status: keyof typeof SUPPORT_STATUS_LABELS;
  lastMessageAt: Date;
  tenant: { name: string; orgNumber: string | null };
  createdBy: { name: string | null; email: string };
  assignedTo: { name: string | null } | null;
  _count: { messages: number };
  messages: Array<{ body: string; senderType: string }>;
};

export default async function AdminSupportPage() {
  const result = await listAdminSupportTickets();
  const tickets = (result.success ? result.data : []) as AdminTicket[];

  const openCount = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "WAITING_CUSTOMER"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Headphones className="h-7 w-7 text-primary" />
          Support-inbox
        </h1>
        <p className="text-muted-foreground mt-1">
          Chat og tickets fra kunder. {openCount} aktive saker.
        </p>
      </div>

      {!result.success ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Kunne ikke laste inbox.
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Ingen saker ennå</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/admin/support/${ticket.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardDescription className="font-mono text-xs">
                        {ticket.ticketNumber} · {ticket.tenant.name}
                        {ticket.tenant.orgNumber ? ` (${ticket.tenant.orgNumber})` : ""}
                      </CardDescription>
                      <CardTitle className="text-base mt-1">{ticket.subject}</CardTitle>
                    </div>
                    <Badge>{SUPPORT_STATUS_LABELS[ticket.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p className="line-clamp-1">
                    {ticket.messages[0]?.body ?? "Ingen meldinger"}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>{SUPPORT_CATEGORY_LABELS[ticket.category]}</span>
                    <span>
                      Fra {ticket.createdBy.name || ticket.createdBy.email}
                    </span>
                    <span>
                      {ticket.assignedTo?.name
                        ? `Tildelt ${ticket.assignedTo.name}`
                        : "Ikke tildelt"}
                    </span>
                    <span>
                      {format(new Date(ticket.lastMessageAt), "dd.MM.yyyy HH:mm", {
                        locale: nb,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
