import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BcmHelpDialog } from "@/components/bcm/bcm-help-dialog";

function formatDate(date?: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function BcmPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    redirect("/login");
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    redirect("/login");
  }

  const tenantId = selectedMembership.tenantId;

  const [bcmDocuments, auditsRaw, bcmForms] = await Promise.all([
    prisma.document.findMany({
      where: {
        tenantId,
        template: {
          category: "BCM",
        },
      },
      select: {
        id: true,
        title: true,
        version: true,
        status: true,
        updatedAt: true,
        nextReviewDate: true,
        template: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.audit.findMany({
      where: {
        tenantId,
      },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        status: true,
        leadAuditorId: true,
        area: true,
      },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.formTemplate.findMany({
      where: {
        OR: [
          { tenantId, category: "BCM" },
          { isGlobal: true, category: "BCM" },
        ],
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        _count: {
          select: {
            submissions: {
              where: { tenantId },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const continuityAudits = auditsRaw.filter((audit) => {
    const areaValue = audit.area?.toLowerCase() ?? "";
    const titleValue = audit.title.toLowerCase();
    return (
      areaValue.includes("kontinuitet") ||
      titleValue.includes("bcm") ||
      titleValue.includes("kontinuitet")
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold">Beredskap og kontinuitet</h1>
            <p className="text-muted-foreground">
              ISO 22301: Følg opp BCM-planer, krisehåndbok og øvelser
            </p>
          </div>
          <BcmHelpDialog />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/documents">Se alle dokumenter</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/audits/new">Registrer øvelse/test</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>BCM-planer og dokumenter</CardTitle>
            <CardDescription>Planer, krisehåndbøker og gjenopprettingsstrategier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bcmDocuments.length === 0 && (
              <p className="text-sm text-muted-foreground">Ingen BCM-dokumenter registrert enda.</p>
            )}
            {bcmDocuments.map((doc) => (
              <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}>
                <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.template?.name || "Plan"} · Revidert {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline">{doc.status}</Badge>
                    <p className="text-xs text-muted-foreground">
                      Neste gjennomgang: {formatDate(doc.nextReviewDate)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kontinuitetsøvelser og tester</CardTitle>
            <CardDescription>Planlagte og fullførte øvelser med fokus på gjenoppretting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {continuityAudits.length === 0 && (
              <p className="text-sm text-muted-foreground">Ingen øvelser planlagt.</p>
            )}
            {continuityAudits.map((audit) => (
              <Link key={audit.id} href={`/dashboard/audits/${audit.id}`}>
                <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium">{audit.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {audit.area || "Kontinuitet"} · {formatDate(audit.scheduledDate)}
                    </p>
                  </div>
                  <Badge variant="outline">{audit.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* BCM-skjemaer */}
      {bcmForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Beredskapsrelaterte skjemaer</CardTitle>
            <CardDescription>Skjemaer for ROS-analyse, beredskapsplaner og øvelsesrapporter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {bcmForms.map((form) => (
                <Link key={form.id} href={`/dashboard/bcm`}>
                  <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{form.title}</h3>
                      <Badge variant="secondary">{form._count.submissions} svar</Badge>
                    </div>
                    {form.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

