import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { HeroStats } from "@/features/dashboard/components/hero-stats";
import { CriticalAlerts } from "@/features/dashboard/components/critical-alerts";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { MyTasks } from "@/features/dashboard/components/my-tasks";
import { HMSScoreChart } from "@/features/dashboard/components/hms-score-chart";
import { getPermissions } from "@/lib/permissions";
import { subMonths, format } from "date-fns";
import { nb } from "date-fns/locale";

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

  // Beregn kritisk statistikk
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const criticalRisks = risks.filter((r) => r.score && r.score >= 15);
  const myOverdueTasks = measures.filter(
    (m) => m.status !== "DONE" && m.responsibleId === user.id && new Date(m.dueAt) < now
  );
  const myTasksThisWeek = measures.filter(
    (m) =>
      m.status !== "DONE" &&
      m.responsibleId === user.id &&
      new Date(m.dueAt) >= now &&
      new Date(m.dueAt) <= sevenDaysFromNow
  );
  const openIncidents = incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING");

  // Bygg kritiske varsler
  const alerts: Array<{
    id: string;
    title: string;
    type: "overdue" | "upcoming" | "critical";
    link: string;
    date?: Date;
    category: string;
  }> = [];

  // Forfalte tiltak
  measures
    .filter((m) => m.status !== "DONE" && new Date(m.dueAt) < now)
    .slice(0, 3)
    .forEach((m) => {
      alerts.push({
        id: m.id,
        title: m.title,
        type: "overdue" as const,
        link: `/dashboard/actions`,
        date: m.dueAt,
        category: "Tiltak",
      });
    });

  // Kritiske risikoer
  criticalRisks.slice(0, 2).forEach((r) => {
    alerts.push({
      id: r.id,
      title: r.title,
      type: "critical" as const,
      link: `/dashboard/risks/${r.id}`,
      category: "Risiko",
    });
  });

  // Utgått opplæring
  trainings
    .filter((t) => t.validUntil && new Date(t.validUntil) < now && !t.completedAt)
    .slice(0, 2)
    .forEach((t) => {
      alerts.push({
        id: t.id,
        title: t.title,
        type: "overdue" as const,
        link: `/dashboard/training/${t.id}`,
        date: t.validUntil!,
        category: "Opplæring",
      });
    });

  // Kommende revisjoner (neste 7 dager)
  audits
    .filter(
      (a) =>
        a.status !== "COMPLETED" &&
        new Date(a.scheduledDate) >= now &&
        new Date(a.scheduledDate) <= sevenDaysFromNow
    )
    .slice(0, 2)
    .forEach((a) => {
      alerts.push({
        id: a.id,
        title: a.title,
        type: "upcoming" as const,
        link: `/dashboard/audits/${a.id}`,
        date: a.scheduledDate,
        category: "Revisjon",
      });
    });

  // Sorter: Kritiske først, så forfalte, så kommende
  const sortedAlerts = alerts.sort((a, b) => {
    const priority = { critical: 0, overdue: 1, upcoming: 2 };
    return priority[a.type] - priority[b.type];
  });

  // Bygg aktivitetsfeed (siste 5)
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
    .slice(0, 5);


  // Bygg mine oppgaver (maks 6 viktigste)
  const myTasks: Array<{
    id: string;
    title: string;
    type: "measure" | "training" | "audit";
    dueDate: Date | undefined;
    priority: "high" | "medium" | "low";
    link: string;
  }> = [];

  // Mine forfalte tiltak
  myOverdueTasks.forEach((m) => {
    myTasks.push({
      id: m.id,
      title: m.title,
      type: "measure" as const,
      dueDate: m.dueAt,
      priority: "high" as const,
      link: `/dashboard/actions`,
    });
  });

  // Mine tiltak denne uken
  myTasksThisWeek.slice(0, 3).forEach((m) => {
    myTasks.push({
      id: m.id,
      title: m.title,
      type: "measure" as const,
      dueDate: m.dueAt,
      priority: "medium" as const,
      link: `/dashboard/actions`,
    });
  });

  // Min ventende opplæring
  trainings
    .filter((t) => t.userId === user.id && !t.completedAt)
    .slice(0, 2)
    .forEach((t) => {
      const priority: "high" | "medium" | "low" = t.validUntil && new Date(t.validUntil) < now ? "high" : "low";
      myTasks.push({
        id: t.id,
        title: t.title,
        type: "training",
        dueDate: t.validUntil || undefined,
        priority,
        link: `/dashboard/training/${t.id}`,
      });
    });

  const sortedTasks = myTasks.slice(0, 6);

  // Bygg Hero Stats
  const heroStats = [];

  // Kritiske risikoer (alltid vis hvis tilgang)
  if (permissions.canReadRisks && criticalRisks.length > 0) {
    heroStats.push({
      title: "Kritiske risikoer",
      value: criticalRisks.length,
      subtitle: `Av ${risks.length} risikoer totalt`,
      variant: "danger" as const,
      icon: "risk" as const,
    });
  }

  // Mine forfalte oppgaver
  if (myOverdueTasks.length > 0) {
    heroStats.push({
      title: "Forfalte oppgaver",
      value: myOverdueTasks.length,
      subtitle: "Krever handling nå",
      variant: "danger" as const,
      icon: "todo" as const,
    });
  }

  // Mine oppgaver denne uken
  const weekTaskVariant: "danger" | "warning" | "success" | "info" = myTasksThisWeek.length > 5 ? "warning" : "success";
  heroStats.push({
    title: "Oppgaver denne uken",
    value: myTasksThisWeek.length,
    subtitle: "Planlagt 7 dager frem",
    variant: weekTaskVariant,
    icon: "check" as const,
  });

  // Åpne hendelser (hvis tilgang)
  if (permissions.canReadIncidents && openIncidents.length > 0) {
    heroStats.push({
      title: "Åpne hendelser",
      value: openIncidents.length,
      subtitle: "Må utredes",
      variant: "warning" as const,
      icon: "trend" as const,
    });
  }

  // Hvis vi har mindre enn 3 stats, legg til HMS compliance eller annen relevant stat
  if (heroStats.length < 3 && permissions.canViewAnalytics) {
    const completedMeasures = measures.filter((m) => m.status === "DONE").length;
    const totalMeasures = measures.length;
    const complianceRate = totalMeasures > 0 ? Math.round((completedMeasures / totalMeasures) * 100) : 100;
    const complianceVariant: "danger" | "warning" | "success" | "info" = 
      complianceRate >= 80 ? "success" : complianceRate >= 60 ? "warning" : "danger";

    heroStats.push({
      title: "Tiltaksgjennomføring",
      value: complianceRate,
      subtitle: `${completedMeasures} av ${totalMeasures} fullført`,
      variant: complianceVariant,
      icon: "trend" as const,
    });
  }

  // Generer HMS-score data for siste 6 måneder
  const hmsScoreData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    // Beregn score basert på:
    // - Risikoer lukket (30%)
    // - Hendelser håndtert (25%)
    // - Tiltak fullført (25%)
    // - Dokumenter oppdatert (20%)
    
    const monthRisks = risks.filter((r) => 
      r.createdAt <= monthEnd
    );
    const closedRisks = monthRisks.filter((r) => r.status === "CLOSED");
    const riskScore = monthRisks.length > 0 ? (closedRisks.length / monthRisks.length) * 30 : 30;

    const monthIncidents = incidents.filter((i) =>
      i.createdAt <= monthEnd
    );
    const closedIncidents = monthIncidents.filter((i) => i.status === "CLOSED");
    const incidentScore = monthIncidents.length > 0 ? (closedIncidents.length / monthIncidents.length) * 25 : 25;

    const monthMeasures = measures.filter((m) =>
      m.createdAt <= monthEnd
    );
    const completedMeasures = monthMeasures.filter((m) => m.status === "DONE");
    const measureScore = monthMeasures.length > 0 ? (completedMeasures.length / monthMeasures.length) * 25 : 25;

    const monthDocuments = documents.filter((d) =>
      d.updatedAt >= monthStart && d.updatedAt <= monthEnd
    );
    const documentScore = monthDocuments.length > 0 ? Math.min((monthDocuments.length / 5) * 20, 20) : 15;

    const totalScore = Math.round(riskScore + incidentScore + measureScore + documentScore);

    hmsScoreData.push({
      month: format(monthDate, 'MMM', { locale: nb }),
      score: Math.min(totalScore, 100),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Velkommen, {user.name || user.email}
        </h1>
        <p className="text-muted-foreground">
          Din HMS-oversikt for i dag
        </p>
      </div>

      {/* Hero Stats */}
      {heroStats.length > 0 && <HeroStats stats={heroStats.slice(0, 4)} />}

      {/* Critical Alerts */}
      {sortedAlerts.length > 0 && <CriticalAlerts alerts={sortedAlerts} />}

      {/* Quick Actions */}
      <QuickActions permissions={permissions} userRole={userRole} />

      {/* Main Grid - 2 kolonne layout på desktop */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Venstre kolonne */}
        <div className="space-y-6">
          {/* Mine oppgaver */}
          {sortedTasks.length > 0 && <MyTasks tasks={sortedTasks} />}
          
          {/* Activity Feed */}
          {activities.length > 0 && <ActivityFeed activities={activities} />}
        </div>

        {/* Høyre kolonne */}
        <div className="space-y-6">
          {/* HMS-score graf */}
          <HMSScoreChart data={hmsScoreData} />
        </div>
      </div>
    </div>
  );
}
