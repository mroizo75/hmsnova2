import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { StatsCard } from "@/features/dashboard/components/stats-card";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { UpcomingDeadlines } from "@/features/dashboard/components/upcoming-deadlines";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { MyTasks } from "@/features/dashboard/components/my-tasks";
import { getPermissions, getRoleDisplayName, getRoleDescription } from "@/lib/permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const tenantId = user.tenants[0].tenantId;
  const userRole = user.tenants[0].role;
  const permissions = getPermissions(userRole);

  // Hent statistikk fra moduler brukeren har tilgang til
  const [
    documents,
    risks,
    incidents,
    measures,
    audits,
    trainings,
    goals,
  ] = await Promise.all([
    permissions.canReadDocuments
      ? prisma.document.findMany({ where: { tenantId } })
      : [],
    permissions.canReadRisks
      ? prisma.risk.findMany({ where: { tenantId } })
      : [],
    permissions.canReadIncidents
      ? prisma.incident.findMany({
          where: {
            tenantId,
            // Ansatt ser kun egne hendelser
            ...(userRole === "ANSATT" && { reportedById: user.id }),
          },
        })
      : [],
    permissions.canReadActions
      ? prisma.measure.findMany({
          where: {
            tenantId,
            // Ansatt ser kun egne tiltak
            ...(userRole === "ANSATT" && { assignedToId: user.id }),
          },
        })
      : [],
    permissions.canReadAudits
      ? prisma.audit.findMany({ where: { tenantId }, include: { findings: true } })
      : [],
    permissions.canReadOwnTraining || permissions.canReadAllTraining
      ? prisma.training.findMany({
          where: {
            tenantId,
            // Vis kun egen opplæring hvis ikke tilgang til all
            ...(!permissions.canReadAllTraining && { userId: user.id }),
          },
        })
      : [],
    permissions.canReadGoals
      ? prisma.goal.findMany({ where: { tenantId } })
      : [],
  ]);

  // Beregn statistikk
  const now = new Date();
  const highRisks = risks.filter((r) => r.score && r.score >= 15);
  const openIncidents = incidents.filter((i) => i.status !== "CLOSED");
  const overdueMeasures = measures.filter(
    (m) => m.status !== "DONE" && new Date(m.dueAt) < now
  );
  const openFindings = audits.reduce(
    (sum, a) => sum + a.findings.filter((f) => f.status !== "VERIFIED").length,
    0
  );
  const expiredTrainings = trainings.filter(
    (t) => t.validUntil && new Date(t.validUntil) < now
  );
  const activeGoals = goals.filter((g) => g.status === "ACTIVE");

  // Bygg aktivitetsfeed (siste 10)
  const activities = [
    ...documents.map((d) => ({
      id: d.id,
      type: "document" as const,
      title: d.title,
      timestamp: d.createdAt,
      link: `/dashboard/documents/${d.id}`,
      status: d.status,
    })),
    ...risks.map((r) => ({
      id: r.id,
      type: "risk" as const,
      title: r.title,
      timestamp: r.createdAt,
      link: `/dashboard/risks/${r.id}`,
      status: r.status,
    })),
    ...incidents.map((i) => ({
      id: i.id,
      type: "incident" as const,
      title: i.title,
      timestamp: i.occurredAt,
      link: `/dashboard/incidents/${i.id}`,
      status: i.status,
    })),
    ...measures.map((m) => ({
      id: m.id,
      type: "action" as const,
      title: m.title,
      timestamp: m.createdAt,
      link: `/dashboard/actions/${m.id}`,
      status: m.status,
    })),
    ...audits.map((a) => ({
      id: a.id,
      type: "audit" as const,
      title: a.title,
      timestamp: a.createdAt,
      link: `/dashboard/audits/${a.id}`,
      status: a.status,
    })),
    ...trainings.map((t) => ({
      id: t.id,
      type: "training" as const,
      title: t.title,
      timestamp: t.createdAt,
      link: `/dashboard/training/${t.id}`,
      status: t.completedAt ? "COMPLETED" : "PENDING",
    })),
    ...goals.map((g) => ({
      id: g.id,
      type: "goal" as const,
      title: g.title,
      timestamp: g.createdAt,
      link: `/dashboard/goals/${g.id}`,
      status: g.status,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Bygg fristliste (neste 30 dager)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const deadlines = [
    ...measures
      .filter((m) => m.status !== "DONE" && new Date(m.dueAt) <= thirtyDaysFromNow)
      .map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueAt,
        type: "action" as const,
        link: `/dashboard/actions/${m.id}`,
        isOverdue: new Date(m.dueAt) < now,
      })),
    ...audits
      .filter(
        (a) =>
          a.status !== "COMPLETED" &&
          new Date(a.scheduledDate) <= thirtyDaysFromNow
      )
      .map((a) => ({
        id: a.id,
        title: a.title,
        dueDate: a.scheduledDate,
        type: "audit" as const,
        link: `/dashboard/audits/${a.id}`,
        isOverdue: new Date(a.scheduledDate) < now,
      })),
    ...trainings
      .filter((t) => t.validUntil && new Date(t.validUntil) <= thirtyDaysFromNow)
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.validUntil!,
        type: "training" as const,
        link: `/dashboard/training/${t.id}`,
        isOverdue: new Date(t.validUntil!) < now,
      })),
    ...goals
      .filter((g) => g.deadline && new Date(g.deadline) <= thirtyDaysFromNow)
      .map((g) => ({
        id: g.id,
        title: g.title,
        dueDate: g.deadline!,
        type: "goal" as const,
        link: `/dashboard/goals/${g.id}`,
        isOverdue: new Date(g.deadline!) < now && g.status !== "ACHIEVED",
      })),
  ]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  // Bygg mine oppgaver (tiltak jeg er ansvarlig for, opplæring jeg må ta, dokumenter jeg må godkjenne)
  const myTasks = [];

  // Tiltak jeg er ansvarlig for (ikke fullført)
  const myMeasures = await prisma.measure.findMany({
    where: {
      tenantId,
      responsibleId: user.id,
      status: { not: "DONE" },
    },
    orderBy: { dueAt: "asc" },
    take: 10,
  });

  myTasks.push(
    ...myMeasures.map((m) => ({
      id: m.id,
      title: m.title,
      type: "measure" as const,
      dueDate: m.dueAt,
      priority: (new Date(m.dueAt) < now
        ? "high"
        : new Date(m.dueAt) < thirtyDaysFromNow
        ? "medium"
        : "low") as "high" | "medium" | "low",
      link: `/dashboard/actions/${m.id}`,
    }))
  );

  // Opplæring jeg må fullføre (ikke fullført eller utgått)
  const myPendingTrainings = await prisma.training.findMany({
    where: {
      tenantId,
      userId: user.id,
      OR: [
        { completedAt: null },
        { validUntil: { lte: thirtyDaysFromNow } },
      ],
    },
    orderBy: { validUntil: "asc" },
    take: 10,
  });

  myTasks.push(
    ...myPendingTrainings.map((t) => ({
      id: t.id,
      title: t.title,
      type: "training" as const,
      dueDate: t.validUntil || undefined,
      priority: (t.validUntil && new Date(t.validUntil) < now
        ? "high"
        : t.validUntil && new Date(t.validUntil) < thirtyDaysFromNow
        ? "medium"
        : "low") as "high" | "medium" | "low",
      link: `/dashboard/training/${t.id}`,
    }))
  );

  // Revisjoner jeg er ansvarlig for (ikke fullført)
  if (permissions.canReadAudits) {
    const myAudits = await prisma.audit.findMany({
      where: {
        tenantId,
        leadAuditorId: user.id,
        status: { not: "COMPLETED" },
        scheduledDate: { lte: thirtyDaysFromNow },
      },
      orderBy: { scheduledDate: "asc" },
      take: 5,
    });

    myTasks.push(
      ...myAudits.map((a) => ({
        id: a.id,
        title: a.title,
        type: "audit" as const,
        dueDate: a.scheduledDate,
        priority: (new Date(a.scheduledDate) < now
          ? "high"
          : new Date(a.scheduledDate) < thirtyDaysFromNow
          ? "medium"
          : "low") as "high" | "medium" | "low",
        link: `/dashboard/audits/${a.id}`,
      }))
    );
  }

  // Sorter etter prioritet og dato
  const sortedTasks = myTasks
    .sort((a, b) => {
      // Først prioritet
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      // Så dato
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    })
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Velkommen, {user.name || user.email}
        </h1>
        <p className="text-muted-foreground">
          HMS Nova – Oversikt over ditt HMS/HSEQ-system
        </p>
      </div>

      {/* Role Info */}
      {!permissions.canViewAnalytics && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Din rolle: {getRoleDisplayName(userRole)}</AlertTitle>
          <AlertDescription>{getRoleDescription(userRole)}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid - vis kun det brukeren har tilgang til */}
      {permissions.canViewAnalytics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {permissions.canReadDocuments && (
              <StatsCard
                title="Dokumenter"
                value={documents.length}
                description={`${documents.filter((d) => d.status === "APPROVED").length} godkjente`}
                icon="FileText"
                variant="default"
              />
            )}
            {permissions.canReadRisks && (
              <StatsCard
                title="Høyrisiko"
                value={highRisks.length}
                description={`Av ${risks.length} risikoer`}
                icon="AlertTriangle"
                variant={highRisks.length > 0 ? "danger" : "success"}
              />
            )}
            {permissions.canReadIncidents && (
              <StatsCard
                title={userRole === "ANSATT" ? "Mine hendelser" : "Åpne hendelser"}
                value={openIncidents.length}
                description={`${incidents.length} totalt`}
                icon="AlertCircle"
                variant={openIncidents.length > 5 ? "warning" : "success"}
              />
            )}
            {permissions.canReadActions && (
              <StatsCard
                title={userRole === "ANSATT" ? "Mine tiltak" : "Forfalte tiltak"}
                value={overdueMeasures.length}
                description={`${measures.filter((m) => m.status === "DONE").length} fullført`}
                icon="ListTodo"
                variant={overdueMeasures.length > 0 ? "danger" : "success"}
              />
            )}
          </div>

          {/* Second Stats Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {permissions.canReadAudits && (
              <StatsCard
                title="Åpne revisjonsfunn"
                value={openFindings}
                description={`Fra ${audits.length} revisjoner`}
                icon="ClipboardCheck"
                variant={openFindings > 0 ? "warning" : "success"}
              />
            )}
            {(permissions.canReadOwnTraining || permissions.canReadAllTraining) && (
              <StatsCard
                title={permissions.canReadAllTraining ? "Utgåtte kurs" : "Mine kurs"}
                value={expiredTrainings.length}
                description={`${trainings.length} opplæringer totalt`}
                icon="GraduationCap"
                variant={expiredTrainings.length > 0 ? "warning" : "success"}
              />
            )}
            {permissions.canReadGoals && (
              <StatsCard
                title="Aktive mål"
                value={activeGoals.length}
                description={`${goals.filter((g) => g.status === "ACHIEVED").length} oppnådd`}
                icon="Target"
                variant="default"
              />
            )}
          </div>
        </>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Feed - alle roller ser aktivitet */}
        <ActivityFeed activities={activities} />

        {/* Mine oppgaver - personlige oppgaver */}
        <MyTasks tasks={sortedTasks} />
      </div>

      {/* Upcoming Deadlines - full bredde hvis det finnes frister */}
      {deadlines.length > 0 && <UpcomingDeadlines deadlines={deadlines} />}

      {/* Quick Actions - tilpass basert på tilganger */}
      <QuickActions permissions={permissions} userRole={userRole} />
    </div>
  );
}
