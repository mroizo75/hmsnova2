import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  buildMicrosoftAdminConsentUrl,
  type MicrosoftConsentResult,
} from "@/lib/microsoft-admin-consent";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchSettingsData } from "@/server/queries/settings.queries";
import { SettingsContent } from "@/features/settings/components/settings-content";

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

  const { consent } = await searchParams;
  const consentResult = CONSENT_RESULTS.find((result) => result === consent) ?? null;

  const initialData = await fetchSettingsData(session.user.email);

  if (!initialData) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("header.title")}</h1>
          <p className="text-muted-foreground">
            {t("header.description")}
          </p>
        </div>
        <PageHelpDialog content={helpContent.settings} />
      </div>

      <SettingsContent
        initialData={initialData}
        adminConsentUrl={buildAdminConsentUrl()}
        consentResult={consentResult}
        userEmail={session.user.email}
      />
    </div>
  );
}
