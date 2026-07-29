import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantSettingsForm } from "@/features/settings/components/tenant-settings-form";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { UserManagement } from "@/features/settings/components/user-management";
import { SubscriptionInfo } from "@/features/settings/components/subscription-info";
import { AzureAdIntegration } from "@/features/settings/components/azure-ad-integration";
import { NotificationSettings } from "@/features/settings/components/notification-settings";
import { SimpleMenuSettings } from "@/features/settings/components/simple-menu-settings";
import { ModuleVisibilitySettings } from "@/features/settings/components/module-visibility-settings";
import { RuhModuleSettings } from "@/features/settings/components/ruh-module-settings";
import { parseModuleVisibilityConfig } from "@/lib/module-visibility";
import {
  buildMicrosoftAdminConsentUrl,
  type MicrosoftConsentResult,
} from "@/lib/microsoft-admin-consent";
import { Building2, User, Users, CreditCard, Cloud, Bell, PanelLeft, Lock } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";

const CONSENT_RESULTS: MicrosoftConsentResult[] = ["granted", "denied", "failed"];

function buildAdminConsentUrl(): string | null {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;

  if (!clientId || !appUrl) {
    return null;
  }

  return buildMicrosoftAdminConsentUrl({ clientId, appUrl });
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ consent?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("dashboardSettingsPage");

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
            },
          },
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  const tenantId = selectedMembership.tenantId;
  const tenant = selectedMembership.tenant;
  const userTenant = selectedMembership; // Inneholder tenant-spesifikke innstillinger
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

  // Bygg opp brukerliste med employeeNumber, stilling og nærmeste leder for UserManagement
  const usersWithEmployeeNumber = tenantUsers.map((ut) => ({
    ...ut,
    employeeNumber: ut.employeeNumber ?? null,
    position: ut.position ?? null,
    managerId: ut.managerId ?? null,
  }));

  // Hent brukergrense basert på pricing tier
  const { getSubscriptionLimits } = await import("@/lib/subscription");
  const limits = getSubscriptionLimits(tenant.pricingTier as any);

  // Etter admin-samtykke hos Microsoft sendes admin tilbake hit — åpne SSO-fanen direkte.
  const { consent } = await searchParams;
  const consentResult = CONSENT_RESULTS.find((result) => result === consent) ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("header.title")}</h1>
          <p className="text-muted-foreground">
            {t("header.description")}
          </p>
        </div>
        <PageHelpDialog content={helpContent.settings} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={consentResult ? "sso" : "company"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.company")}</span>
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <PanelLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.menu")}</span>
          </TabsTrigger>
          <TabsTrigger value="visibility" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Tilganger</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.notifications")}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.users")}</span>
          </TabsTrigger>
          <TabsTrigger value="sso" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.office365")}</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.subscription")}</span>
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

        <TabsContent value="visibility" className="space-y-6">
          <RuhModuleSettings
            initialEnabled={tenant.ruhModuleEnabled}
            isAdmin={isAdmin}
          />
          <ModuleVisibilitySettings
            initialConfig={parseModuleVisibilityConfig(
              (tenant as any).moduleVisibilityConfig ?? null
            )}
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
          <AzureAdIntegration
            tenant={tenant as any}
            isAdmin={isAdmin}
            adminConsentUrl={buildAdminConsentUrl()}
            consentResult={consentResult}
          />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionInfo tenant={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
