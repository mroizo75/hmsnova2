import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchAudits } from "@/server/queries/audit.queries";
import { AuditsContent } from "@/features/audits/components/audits-content";

export const dynamic = "force-dynamic";

export default function AuditsPage() {
  return (
    <Suspense fallback={<div>Laster...</div>}>
      <AuditsPageContent />
    </Suspense>
  );
}

async function AuditsPageContent() {
  const t = await getTranslations("dashboardAuditsPage");
  const locale = await getLocale();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.tenantId) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    },
    select: { tenantId: true },
  });
  if (!membership) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const initialData = await fetchAudits();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.audits} />
        </div>
        <Link href="/dashboard/audits/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newAudit")}
          </Button>
        </Link>
      </div>

      <AuditsContent initialData={initialData} locale={locale} />
    </div>
  );
}
