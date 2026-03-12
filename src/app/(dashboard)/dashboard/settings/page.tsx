import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantSettingsForm } from "@/features/settings/components/tenant-settings-form";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { UserManagement } from "@/features/settings/components/user-management";
import { SubscriptionInfo } from "@/features/settings/components/subscription-info";
import { AzureAdIntegration } from "@/features/settings/components/azure-ad-integration";
import { NotificationSettings } from "@/features/settings/components/notification-settings";
import { SimpleMenuSettings } from "@/features/settings/components/simple-menu-settings";
import { Building2, User, Users, CreditCard, Cloud, Bell, PanelLeft } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: {
            include: {
              subscription: true,
              invoices: {
                orderBy: { createdAt: "desc" },
                take: 10,
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const tenantId = user.tenants[0].tenantId;
  const tenant = user.tenants[0].tenant;
  const userTenant = user.tenants[0]; // Inneholder tenant-spesifikke innstillinger
  const isAdmin = userTenant.role === "ADMIN";

  // Hent alle brukere i tenant (inkl. invitationSentAt for «Aktiver»-knapp)
  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Bygg opp brukerliste med employeeNumber for UserManagement
  const usersWithEmployeeNumber = tenantUsers.map((ut) => ({
    ...ut,
    employeeNumber: ut.employeeNumber ?? null,
  }));

  // Hent brukergrense basert på pricing tier
  const { getSubscriptionLimits } = await import("@/lib/subscription");
  const limits = getSubscriptionLimits(tenant.pricingTier as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">Innstillinger</h1>
          <p className="text-muted-foreground">
            Administrer bedrift, brukere og system
          </p>
        </div>
        <PageHelpDialog content={helpContent.settings} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Bedrift</span>
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <PanelLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Enkel meny</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Varsler</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Brukere</span>
          </TabsTrigger>
          <TabsTrigger value="sso" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">Office 365</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Abonnement</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <TenantSettingsForm tenant={tenant} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="menu">
          <SimpleMenuSettings
            initialSimpleMenuItems={
              (tenant.simpleMenuItems as string[] | null) ?? null
            }
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="profile">
          <UserProfileForm user={user} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings user={user as any} userTenant={userTenant} tenant={tenant as any} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement
            users={usersWithEmployeeNumber}
            currentUserId={user.id}
            isAdmin={isAdmin}
            pricingTier={tenant.pricingTier}
            maxUsers={limits.maxUsers}
          />
        </TabsContent>

        <TabsContent value="sso">
          <AzureAdIntegration tenant={tenant as any} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionInfo tenant={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
