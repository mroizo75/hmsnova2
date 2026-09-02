import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";
import { fetchDashboardData } from "@/server/queries/dashboard.queries";
import { getMessagesForTenant } from "@/server/actions/corporate-group-messages.actions";
import { KonsernMessagesBanner } from "@/features/konsern/components/konsern-messages-banner";
import { evaluateTenantAlerts } from "@/lib/tenant-alerts";
import { TenantAlertsWidget } from "@/features/dashboard/components/tenant-alerts-widget";

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

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Du har ikke tilgang til valgt tenant.</div>;
  }

  if (selectedMembership.tenant.isTavleOnly) {
    redirect("/dashboard/hms-tavle");
  }

  const permissions = getPermissions(selectedMembership.role);
  const tenant = selectedMembership.tenant as typeof selectedMembership.tenant & {
    startpakkeCompleted?: boolean;
    onboardingStatus?: string;
    createdAt?: Date;
  };

  if (
    permissions.canUpdateSettings &&
    !tenant.startpakkeCompleted &&
    tenant.onboardingStatus !== "COMPLETED"
  ) {
    const checkTenantId = selectedMembership.tenantId;
    const incidentCount = await prisma.incident.count({ where: { tenantId: checkTenantId } });
    const hasExistingData =
      incidentCount > 0 ||
      (await prisma.document.count({ where: { tenantId: checkTenantId } })) > 0 ||
      (await prisma.risk.count({ where: { tenantId: checkTenantId } })) > 0 ||
      (await prisma.routine.count({ where: { tenantId: checkTenantId } })) > 0;

    if (hasExistingData) {
      await prisma.tenant.update({
        where: { id: checkTenantId },
        data: { startpakkeCompleted: true },
      });
    } else {
      redirect("/dashboard/welcome");
    }
  }

  await prisma.$executeRawUnsafe(`
    UPDATE Incident
    SET status = 'OPEN'
    WHERE status NOT IN ('OPEN','INVESTIGATING','ACTION_TAKEN','CLOSED')
       OR status IS NULL
       OR status = ''
  `);

  const initialData = await fetchDashboardData();

  if (!initialData) {
    return <div>Kunne ikke laste dashboard-data.</div>;
  }

  const konsernMessages = await getMessagesForTenant();
  const unreadKonsernMessages = konsernMessages.filter((m) => !m.isRead);

  // Systematiske HMS-varsler er kun relevant for roller med oppfølgingsansvar
  const tenantAlerts =
    selectedMembership.role !== "ANSATT"
      ? await evaluateTenantAlerts(selectedMembership.tenantId)
      : [];

  return (
    <div className="space-y-4">
      {unreadKonsernMessages.length > 0 && (
        <KonsernMessagesBanner messages={unreadKonsernMessages} />
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Velkommen, {initialData.userName}
        </h1>
        <p className="text-muted-foreground">Her er ditt dashboard for i dag.</p>
      </div>
      {selectedMembership.role !== "ANSATT" && <TenantAlertsWidget alerts={tenantAlerts} />}
      <DashboardContent initialData={initialData} />
    </div>
  );
}
