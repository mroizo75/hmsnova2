"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TenantSettingsForm } from "@/features/settings/components/tenant-settings-form";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { TotpSetup } from "@/features/whistleblowing/components/totp-setup";
import { SubscriptionInfo } from "@/features/settings/components/subscription-info";
import { AzureAdIntegration } from "@/features/settings/components/azure-ad-integration";
import { NotificationSettings } from "@/features/settings/components/notification-settings";
import { SimpleMenuSettings } from "@/features/settings/components/simple-menu-settings";
import { ModuleVisibilitySettings } from "@/features/settings/components/module-visibility-settings";
import { RuhModuleSettings } from "@/features/settings/components/ruh-module-settings";
import { AiSettings } from "@/features/settings/components/ai-settings";
import { DataExportCard } from "@/features/settings/components/data-export-card";
import { TenantLogoUpload } from "@/features/settings/components/tenant-logo-upload";
import { parseModuleVisibilityConfig } from "@/lib/module-visibility";
import { Building2, User, CreditCard, Cloud, Bell, PanelLeft, Lock, BarChart3, Monitor, Sparkles } from "lucide-react";
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
  userEmail: string;
}

export function SettingsContent({
  initialData,
  adminConsentUrl,
  consentResult,
  userEmail,
}: SettingsContentProps) {
  const t = useTranslations("dashboardSettingsPage");

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettingsData(userEmail),
    initialData,
  });

  if (!data) return null;

  const { user, tenant, userTenant, isAdmin, intelligenceConsent, tavleSubscription, tavleCount, tenantId } = data;

  return (
    <Tabs defaultValue={consentResult ? "sso" : "company"} className="space-y-6">
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
            (tenant as any).moduleVisibilityConfig ?? null,
          )}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="ai">
        <AiSettings initialEnabled={(tenant as any).aiEnabled ?? true} isAdmin={isAdmin} />
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
