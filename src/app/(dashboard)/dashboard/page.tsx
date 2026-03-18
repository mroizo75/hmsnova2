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
import { TaskCenter } from "@/features/dashboard/components/task-center";
import { AiAssistantPanel } from "@/features/dashboard/components/ai-assistant-panel";
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

  // Sikre at eldre avvik har gyldig status etter enum-endringer
  await prisma.$executeRawUnsafe(`
    UPDATE Incident
    SET status = 'OPEN'
    WHERE status NOT IN ('OPEN','INVESTIGATING','ACTION_TAKEN','CLOSED')
       OR status IS NULL
       OR status = ''
  `);

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
      link: `/dashboard/actions`,
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
  //
  // Vekting: Tiltak (35%) · Risikoer (30%) · Hendelser (20%) · Dokumenter (15%)
  //
  // Gradert score per status – aktiv behandling gir poeng, ikke bare lukking:
  //   Risikoer:  CLOSED=1.0  · ACCEPTED=1.0 (formelt akseptert er god styring)
  //              MITIGATING=0.7 (tiltak på plass) · OPEN=0.2
  //   Hendelser: CLOSED=1.0  · ACTION_TAKEN=0.8 · INVESTIGATING=0.5 · OPEN=0.2
  //   Tiltak:    DONE=1.0    · IN_PROGRESS=0.5  · andre=0.0
  //   Dokumenter: fast 15 p (ingen straff for inaktiv måned)
  const hmsScoreData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    // Risikoer (30%)
    const monthRisks = risks.filter((r) => r.createdAt <= monthEnd);
    const riskWeightMap: Record<string, number> = {
      CLOSED: 1.0,
      ACCEPTED: 1.0,
      MITIGATING: 0.7,
      OPEN: 0.2,
    };
    const riskScore =
      monthRisks.length > 0
        ? (monthRisks.reduce((sum, r) => sum + (riskWeightMap[r.status] ?? 0.2), 0) /
            monthRisks.length) *
          30
        : 30;

    // Hendelser (20%)
    const monthIncidents = incidents.filter((inc) => inc.createdAt <= monthEnd);
    const incidentWeightMap: Record<string, number> = {
      CLOSED: 1.0,
      ACTION_TAKEN: 0.8,
      INVESTIGATING: 0.5,
      OPEN: 0.2,
    };
    const incidentScore =
      monthIncidents.length > 0
        ? (monthIncidents.reduce(
            (sum, inc) => sum + (incidentWeightMap[inc.status] ?? 0.2),
            0
          ) /
            monthIncidents.length) *
          20
        : 20;

    // Tiltak (35%)
    const monthMeasures = measures.filter((m) => m.createdAt <= monthEnd);
    const measureWeightMap: Record<string, number> = {
      DONE: 1.0,
      IN_PROGRESS: 0.5,
    };
    const measureScore =
      monthMeasures.length > 0
        ? (monthMeasures.reduce(
            (sum, m) => sum + (measureWeightMap[m.status] ?? 0),
            0
          ) /
            monthMeasures.length) *
          35
        : 35;

    // Dokumenter (15%): fast grunnverdi, ingen straff for inaktive måneder
    const documentScore = 15;

    const totalScore = Math.round(riskScore + incidentScore + measureScore + documentScore);

    hmsScoreData.push({
      month: format(monthDate, "MMM", { locale: nb }),
      score: Math.min(totalScore, 100),
    });
  }

  const tenantName = session.user.tenantName;
  const summaryParts: string[] = [];
  if (criticalRisks.length > 0) summaryParts.push(`${criticalRisks.length} kritiske risikoer`);
  if (myOverdueTasks.length > 0) summaryParts.push(`${myOverdueTasks.length} forfalte oppgaver`);
  if (myTasksThisWeek.length > 0) summaryParts.push(`${myTasksThisWeek.length} oppgaver denne uken`);
  if (openIncidents.length > 0) summaryParts.push(`${openIncidents.length} åpne hendelser`);
  const summaryLine = summaryParts.length > 0 ? summaryParts.join(" · ") : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Velkommen, {user.name || user.email}
        </h1>
        <p className="text-muted-foreground">
          {summaryLine ?? "Din HMS-oversikt for i dag"}
        </p>
        {tenantName && (
          <div className="mt-2 lg:hidden">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{tenantName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Hero Stats */}
      {heroStats.length > 0 && <HeroStats stats={heroStats.slice(0, 4)} />}

      {/* Critical Alerts */}
      {sortedAlerts.length > 0 && <CriticalAlerts alerts={sortedAlerts} />}

      <AiAssistantPanel />

      {/* Quick Actions - kompakt rad */}
      <QuickActions permissions={permissions} userRole={userRole} />

      {/* Oppgavesenter + hovedinnhold: oppgaver og aktivitet side om side med graf */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <TaskCenter tenantId={tenantId} userId={user.id} />
          {sortedTasks.length > 0 && <MyTasks tasks={sortedTasks} />}
          {activities.length > 0 && <ActivityFeed activities={activities} />}
        </div>
        <div className="lg:col-span-2 space-y-6">
          <HMSScoreChart data={hmsScoreData} />
        </div>
      </div>
    </div>
  );
}
