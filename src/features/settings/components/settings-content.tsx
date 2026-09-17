"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantSettingsForm } from "@/features/settings/components/tenant-settings-form";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { TotpSetup } from "@/features/whistleblowing/components/totp-setup";
import { SubscriptionInfo } from "@/features/settings/components/subscription-info";
import { AzureAdIntegration } from "@/features/settings/components/azure-ad-integration";
import { TripletexIntegration } from "@/features/settings/components/tripletex-integration";
import { CompanyTimePayrollSettings } from "@/features/settings/components/company-time-payroll-settings";
import { NotificationSettings } from "@/features/settings/components/notification-settings";
import { SimpleMenuSettings } from "@/features/settings/components/simple-menu-settings";
import { ModuleVisibilitySettings } from "@/features/settings/components/module-visibility-settings";
import { RuhModuleSettings } from "@/features/settings/components/ruh-module-settings";
import { MocModuleSettings } from "@/features/settings/components/moc-module-settings";
import { AiSettings } from "@/features/settings/components/ai-settings";
import { DataExportCard } from "@/features/settings/components/data-export-card";
import { TenantLogoUpload } from "@/features/settings/components/tenant-logo-upload";
import { parseModuleVisibilityConfig } from "@/lib/module-visibility";
import { aliasDashboardMenuHrefs } from "@/lib/legal-link-repair";
import { Building2, User, CreditCard, Cloud, Bell, PanelLeft, Lock, BarChart3, Monitor, Sparkles, Receipt } from "lucide-react";
import { getAccountingSettings } from "@/server/actions/accounting.actions";
import { IntelligenceConsentToggle } from "@/features/intelligence/components/consent-toggle";
import { SetupGuideToggle } from "@/features/settings/components/setup-guide-toggle";
import { TavleSettingsPane } from "@/features/hms-tavle/components/tavle-settings-pane";
import { fetchSettingsData } from "@/server/queries/settings.queries";
import type { MicrosoftConsentResult } from "@/lib/microsoft-admin-consent";

type SettingsData = NonNullable<Awaited<ReturnType<typeof fetchSettingsData>>>;

interface SettingsContentProps {
  initialData: SettingsData;
  adminConsentUrl: string | null;
  consentResult: MicrosoftConsentResult | null;
  defaultTab?: string;
}

export function SettingsContent({
  initialData,
  adminConsentUrl,
  consentResult,
  defaultTab,
}: SettingsContentProps) {
  const t = useTranslations("dashboardSettingsPage");

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettingsData(),
    initialData,
  });

  if (!data) return null;

  const { user, tenant, userTenant, isAdmin, intelligenceConsent, tavleSubscription, tavleCount, tenantId } = data;

  return (
    <Tabs defaultValue={consentResult ? "sso" : defaultTab || "company"} className="space-y-6">
      <TabsList className="flex h-auto w-full min-h-11 justify-start gap-1 overflow-x-auto">
        <TabsTrigger value="company" className="flex shrink-0 items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>{t("tabs.company")}</span>
        </TabsTrigger>
        <TabsTrigger value="menu" className="flex shrink-0 items-center gap-2">
          <PanelLeft className="h-4 w-4" />
          <span>{t("tabs.menu")}</span>
        </TabsTrigger>
        <TabsTrigger value="visibility" className="flex shrink-0 items-center gap-2">
          <Lock className="h-4 w-4" />
          <span>Tilganger</span>
        </TabsTrigger>
        <TabsTrigger value="ai" className="flex shrink-0 items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>AI</span>
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex shrink-0 items-center gap-2">
          <User className="h-4 w-4" />
          <span>{t("tabs.profile")}</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex shrink-0 items-center gap-2">
          <Bell className="h-4 w-4" />
          <span>{t("tabs.notifications")}</span>
        </TabsTrigger>
        <TabsTrigger value="sso" className="flex shrink-0 items-center gap-2">
          <Cloud className="h-4 w-4" />
          <span>{t("tabs.office365")}</span>
        </TabsTrigger>
        <TabsTrigger value="tripletex" className="flex shrink-0 items-center gap-2">
          <Receipt className="h-4 w-4" />
          <span>{t("tabs.tripletex")}</span>
        </TabsTrigger>
        <TabsTrigger value="subscription" className="flex shrink-0 items-center gap-2">
          <CreditCard className="h-4 w-4" />
          <span>{t("tabs.subscription")}</span>
        </TabsTrigger>
        <TabsTrigger value="intelligence" className="flex shrink-0 items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span>Statistikk</span>
        </TabsTrigger>
        <TabsTrigger value="tavle" className="flex shrink-0 items-center gap-2">
          <Monitor className="h-4 w-4" />
          <span>HMS Tavle</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="company" className="space-y-6">
        <TenantLogoUpload currentLogoUrl={(tenant as any).logoUrl} isAdmin={isAdmin} />
        <TenantSettingsForm tenant={tenant} isAdmin={isAdmin} />
        <SetupGuideToggle
          tenantId={tenantId}
          currentlyHidden={(tenant as any).setupGuideHidden ?? false}
          isAdmin={isAdmin}
        />
        <DataExportCard isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="menu">
        <SimpleMenuSettings
          initialSimpleMenuItems={
            aliasDashboardMenuHrefs((tenant.simpleMenuItems as string[] | null) ?? null)
          }
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="visibility" className="space-y-6">
        <RuhModuleSettings
          initialEnabled={tenant.ruhModuleEnabled}
          isAdmin={isAdmin}
        />
        <MocModuleSettings
          initialEnabled={Boolean(tenant.mocModuleEnabled)}
          isAdmin={isAdmin}
          recommended={["oil_gas", "offshore", "manufacturing", "bergverk", "marine", "elektro", "construction"].includes(
            String(tenant.industry ?? "").toLowerCase(),
          )}
        />
        <ModuleVisibilitySettings
          initialConfig={parseModuleVisibilityConfig(
            (tenant as any).moduleVisibilityConfig ?? null,
          )}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="ai" className="space-y-6">
        <AiSettings
          initialEnabled={Boolean(tenant.aiEnabled)}
          activatedAt={tenant.aiAddonActivatedAt ?? null}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="profile" className="space-y-6">
        <UserProfileForm user={user} />
        <TotpSetup />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationSettings user={user as any} userTenant={userTenant} tenant={tenant as any} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="sso">
        <AzureAdIntegration
          tenant={tenant as any}
          isAdmin={isAdmin}
          adminConsentUrl={adminConsentUrl}
          consentResult={consentResult}
        />
      </TabsContent>

      <TabsContent value="tripletex" className="space-y-6">
        <CompanyTimePayrollSettings
          tenantId={tenantId}
          isAdmin={isAdmin}
          config={{
            timeRegistrationEnabled: Boolean(tenant.timeRegistrationEnabled),
            weeklyHoursNorm: tenant.weeklyHoursNorm ?? 37.5,
            lunchBreakMinutes: tenant.lunchBreakMinutes ?? 30,
            dayStartHour: tenant.dayStartHour ?? 7,
            dayEndHour: tenant.dayEndHour ?? 15.5,
            overtime50CapHours: tenant.overtime50CapHours ?? 4.5,
            saturdayOt50UntilHour: tenant.saturdayOt50UntilHour ?? 12,
            useOvertime40Percent: Boolean(tenant.useOvertime40Percent),
            defaultKmRate: tenant.defaultKmRate ?? 5.3,
            kmAllowanceTaxable: Boolean(tenant.kmAllowanceTaxable),
            defaultHourlyRate: tenant.defaultHourlyRate ?? null,
            approximateTaxPercent: tenant.approximateTaxPercent ?? null,
          }}
        />
        <TripletexSettingsPane isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="subscription">
        <SubscriptionInfo tenant={tenant} />
      </TabsContent>

      <TabsContent value="intelligence">
        <IntelligenceConsentToggle
          initialOptedIn={intelligenceConsent?.optedIn ?? true}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="tavle">
        <TavleSettingsPane
          subscription={tavleSubscription}
          tavleCount={tavleCount}
          isAdmin={isAdmin}
        />
      </TabsContent>
    </Tabs>
  );
}

function TripletexSettingsPane({ isAdmin }: { isAdmin: boolean }) {
  const { data } = useQuery({
    queryKey: ["accounting-settings"],
    queryFn: () => getAccountingSettings(),
  });

  if (!data) {
    return <p className="text-sm text-muted-foreground">Laster Tripletex…</p>;
  }
  if (!data.success || !data.data) {
    return <p className="text-sm text-muted-foreground">Kunne ikke laste Tripletex-innstillinger.</p>;
  }

  const s = data.data;
  return (
    <TripletexIntegration
      isAdmin={isAdmin}
      connected={Boolean(s.connected)}
      companyId={s.tripletexCompanyId}
      lastPullAt={s.accountingLastPullAt}
      mapping={{
        activityNormalId: s.tripletexActivityNormalId,
        activityOt50Id: s.tripletexActivityOt50Id,
        activityOt100Id: s.tripletexActivityOt100Id,
        productKmId: s.tripletexProductKmId,
        productMachineHoursId: s.tripletexProductMachineHoursId,
        absenceProjectId: s.absenceProjectId,
      }}
      activities={s.activities}
      products={s.products}
      employees={s.employees}
      txEmployees={s.txEmployees}
      projects={s.projects}
    />
  );
}
