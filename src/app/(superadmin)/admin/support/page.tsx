import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Headphones, MessageSquare } from "lucide-react";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
import { AdminPagination, AdminPaginationSearch } from "@/components/admin-pagination";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Support-inbox | HMS Nova Admin",
};

const ITEMS_PER_PAGE = 25;

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div className="p-8">Ingen tilgang</div>;
  }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const searchTerm = params.search?.trim() || "";

  const where = searchTerm
    ? {
        OR: [
          { subject: { contains: searchTerm, mode: "insensitive" as const } },
          { ticketNumber: { contains: searchTerm, mode: "insensitive" as const } },
          { createdBy: { email: { contains: searchTerm, mode: "insensitive" as const } } },
          { createdBy: { name: { contains: searchTerm, mode: "insensitive" as const } } },
          { tenant: { name: { contains: searchTerm, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [totalItems, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        tenant: { select: { id: true, name: true, orgNumber: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true, senderType: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Saker ({totalItems})</CardTitle>
            <AdminPaginationSearch
              basePath="/admin/support"
              searchTerm={searchTerm}
              placeholder="Søk på emne, ticketnr, e-post..."
            />
          </div>
        </CardHeader>
      </Card>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">
              {searchTerm ? "Ingen saker matcher søket" : "Ingen saker ennå"}
            </p>
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
                    <Badge>
                      {SUPPORT_STATUS_LABELS[ticket.status as keyof typeof SUPPORT_STATUS_LABELS]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p className="line-clamp-1">
                    {ticket.messages[0]?.body ?? "Ingen meldinger"}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      {SUPPORT_CATEGORY_LABELS[ticket.category as keyof typeof SUPPORT_CATEGORY_LABELS]}
                    </span>
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

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/admin/support"
        searchTerm={searchTerm}
      />
    </div>
  );
}
