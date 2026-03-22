import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomizableDashboard } from "@/features/dashboard/components/customizable-dashboard";
import { getPermissions } from "@/lib/permissions";

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

  await prisma.$executeRawUnsafe(`
    UPDATE Incident
    SET status = 'OPEN'
    WHERE status NOT IN ('OPEN','INVESTIGATING','ACTION_TAKEN','CLOSED')
       OR status IS NULL
       OR status = ''
  `);

  const [documents, risks, incidents, measures, audits, trainings, goals, inspections, forms] = await Promise.all([
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
            ...(userRole === "ANSATT" && { reportedById: user.id }),
          },
        })
      : [],
    permissions.canReadActions
      ? prisma.measure.findMany({
          where: {
            tenantId,
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
            ...(!permissions.canReadAllTraining && { userId: user.id }),
          },
        })
      : [],
    permissions.canReadGoals
      ? prisma.goal.findMany({ where: { tenantId } })
      : [],
    permissions.canReadInspections
      ? prisma.inspection.findMany({ where: { tenantId } })
      : [],
    permissions.canReadForms
      ? prisma.formTemplate.findMany({
          where: {
            OR: [{ tenantId }, { isGlobal: true }],
            isActive: true,
          },
          select: {
            id: true,
            title: true,
          },
          orderBy: { title: "asc" },
          take: 200,
        })
      : [],
  ]);

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const criticalRisks = risks.filter((r) => r.score && r.score >= 15);
  const myOverdueTasks = measures.filter(
    (m) => m.status !== "DONE" && m.responsibleId === user.id && new Date(m.dueAt) < now
  );
  const myUpcomingTasks = measures.filter(
    (m) =>
      m.status !== "DONE" &&
      m.responsibleId === user.id &&
      new Date(m.dueAt) >= now &&
      new Date(m.dueAt) <= sevenDaysFromNow
  );
  const openIncidents = incidents.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING");
  const upcomingAudits = audits.filter(
    (a) =>
      a.status !== "COMPLETED" &&
      new Date(a.scheduledDate) >= now &&
      new Date(a.scheduledDate) <= sevenDaysFromNow
  );
  const expiredTraining = trainings.filter(
    (t) => t.validUntil && new Date(t.validUntil) < now && !t.completedAt
  );

  const recentActivities = [
    ...documents.map((d) => ({
      id: d.id,
      timestamp: d.createdAt.getTime(),
    })),
    ...risks.map((r) => ({
      id: r.id,
      timestamp: r.createdAt.getTime(),
    })),
    ...incidents.map((i) => ({
      id: i.id,
      timestamp: i.occurredAt.getTime(),
    })),
    ...measures.map((m) => ({
      id: m.id,
      timestamp: m.createdAt.getTime(),
    })),
    ...audits.map((a) => ({
      id: a.id,
      timestamp: a.createdAt.getTime(),
    })),
    ...trainings.map((t) => ({
      id: t.id,
      timestamp: t.createdAt.getTime(),
    })),
    ...goals.map((g) => ({
      id: g.id,
      timestamp: g.createdAt.getTime(),
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const personalTrainingTasks = trainings.filter((t) => t.userId === user.id && !t.completedAt);

  const moduleCounts: Record<string, number> = {
    incidents: openIncidents.length,
    risks: criticalRisks.length,
    actions: measures.filter((m) => m.status !== "DONE").length,
    inspections: inspections.filter((i) => i.status !== "COMPLETED").length,
    training: trainings.filter((t) => !t.completedAt).length,
    documents: documents.length,
    chemicals: 0,
    audits: audits.filter((a) => a.status !== "COMPLETED").length,
    goals: goals.filter((g) => g.status === "ACTIVE" || g.status === "AT_RISK").length,
    "widget-task-center": myOverdueTasks.length + myUpcomingTasks.length + personalTrainingTasks.length,
    "widget-my-tasks": myOverdueTasks.length + myUpcomingTasks.length + personalTrainingTasks.length,
    "widget-activity-feed": recentActivities.length,
  };

  const statusItems = [
    {
      id: "overdue-actions",
      title: "Forfalte tiltak",
      count: myOverdueTasks.length,
      href: "/dashboard/actions",
      level: "critical" as const,
    },
    {
      id: "critical-risks",
      title: "Kritiske risikoer",
      count: criticalRisks.length,
      href: "/dashboard/risks",
      level: "critical" as const,
    },
    {
      id: "open-incidents",
      title: "Åpne avvik",
      count: openIncidents.length,
      href: "/dashboard/incidents",
      level: "warning" as const,
    },
    {
      id: "upcoming-audits",
      title: "Revisjoner neste 7 dager",
      count: upcomingAudits.length,
      href: "/dashboard/audits",
      level: "warning" as const,
    },
    {
      id: "expired-training",
      title: "Utgått opplæring",
      count: expiredTraining.length,
      href: "/dashboard/training",
      level: "info" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Velkommen, {user.name || user.email}
        </h1>
        <p className="text-muted-foreground">Her er ditt dashboard for i dag.</p>
      </div>
      <CustomizableDashboard
        data={{
          moduleCounts,
          formLinkOptions: forms.map((form) => ({
            label: form.title,
            href: `/dashboard/forms/${form.id}`,
          })),
          statusItems,
        }}
      />
    </div>
  );
}
