import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export const dynamic = "force-dynamic";

async function getAudits(tenantId: string) {
  return await prisma.audit.findMany({
    where: { tenantId },
    include: {
      findings: true,
    },
    orderBy: { scheduledDate: "desc" },
    take: 50,
  });
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    PLANNED: { variant: "outline", label: "Planlagt" },
    IN_PROGRESS: { variant: "default", label: "Pågår" },
    COMPLETED: { variant: "secondary", label: "Fullført" },
    CANCELLED: { variant: "destructive", label: "Avbrutt" },
  };
  const config = variants[status] || variants.PLANNED;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getTypeBadge(type: string) {
  const labels: Record<string, string> = {
    INTERNAL: "Internrevisjon",
    EXTERNAL: "Eksternrevisjon",
    CERTIFICATION: "Sertifisering",
    SUPPLIER: "Leverandørrevisjon",
    FOLLOW_UP: "Oppfølging",
  };
  return <Badge variant="outline">{labels[type] || type}</Badge>;
}

async function AuditsList() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userTenants = await prisma.userTenant.findMany({
    where: { userId: session.user.id },
  });

  if (userTenants.length === 0) {
    return <div>Ingen tenant tilgang</div>;
  }

  const audits = await getAudits(userTenants[0].tenantId);

  if (audits.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ingen revisjoner ennå</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Opprett din første revisjon (internrevisjon, ISO 9001, etc.)
          </p>
          <Link href="/dashboard/audits/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ny revisjon
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisjoner</CardTitle>
        <CardDescription>
          {audits.length} revisjoner totalt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tittel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Område</TableHead>
              <TableHead>Dato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Funn</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.map((audit) => {
              const openFindings = audit.findings.filter(f => f.status === "OPEN").length;
              const majorNc = audit.findings.filter(f => f.findingType === "MAJOR_NC" && f.status === "OPEN").length;
              const minorNc = audit.findings.filter(f => f.findingType === "MINOR_NC" && f.status === "OPEN").length;
              
              return (
                <TableRow key={audit.id}>
                  <TableCell className="font-medium">{audit.title}</TableCell>
                  <TableCell>{getTypeBadge(audit.auditType)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{audit.area}</span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(audit.scheduledDate), "d. MMM yyyy", { locale: nb })}
                  </TableCell>
                  <TableCell>{getStatusBadge(audit.status)}</TableCell>
                  <TableCell>
                    {openFindings > 0 ? (
                      <div className="flex flex-col gap-1">
                        {majorNc > 0 && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            {majorNc} større avvik
                          </Badge>
                        )}
                        {minorNc > 0 && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            {minorNc} mindre avvik
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Ingen funn</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/audits/${audit.id}`}>
                      <Button variant="ghost" size="sm">
                        Se detaljer
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function AuditsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revisjoner</h1>
          <p className="text-muted-foreground">
            Internrevisjoner, ISO 9001, ISO 14001 og andre revisjoner
          </p>
        </div>
        <Link href="/dashboard/audits/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Ny revisjon
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Laster revisjoner...</div>}>
        <AuditsList />
      </Suspense>
    </div>
  );
}
