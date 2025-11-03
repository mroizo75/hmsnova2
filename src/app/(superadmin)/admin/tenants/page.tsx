import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";

export default async function TenantsPage() {
  // Hent kun tenants som har brukere (aktive bedrifter)
  const tenants = await prisma.tenant.findMany({
    where: {
      users: {
        some: {}, // Må ha minst én bruker
      },
    },
    include: {
      subscription: true,
      invoices: {
        where: {
          status: "OVERDUE",
        },
      },
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bedrifter</h1>
          <p className="text-muted-foreground">
            Administrer alle registrerte bedrifter
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Ny bedrift
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle bedrifter ({tenants.length})</CardTitle>
          <CardDescription>
            Oversikt over bedrifter, status og abonnementer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bedrift</TableHead>
                <TableHead>Org.nr</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Brukere</TableHead>
                <TableHead>Faktura</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.orgNumber || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.status === "ACTIVE"
                          ? "default"
                          : tenant.status === "TRIAL"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.subscription ? (
                      <div>
                        <p className="text-sm font-medium">
                          {tenant.subscription.plan}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.subscription.price} kr/{tenant.subscription.billingInterval === "MONTHLY" ? "mnd" : "år"}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{tenant._count.users}</TableCell>
                  <TableCell>
                    {tenant.invoices.length > 0 ? (
                      <Badge variant="destructive">
                        {tenant.invoices.length} forfalt
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">OK</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/tenants/${tenant.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

