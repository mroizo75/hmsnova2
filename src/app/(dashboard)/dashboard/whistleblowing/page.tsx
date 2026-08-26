import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";
import { fetchWhistleblowings } from "@/server/queries/whistleblowing.queries";
import { WhistleblowingContent } from "@/features/whistleblowing/components/whistleblowing-content";

export default async function WhistleblowingListPage() {
  const t = await getTranslations("dashboardWhistleblowingPage");
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canViewWhistleblowing) {
    redirect("/dashboard");
  }

  const initialData = await fetchWhistleblowings();
  if (!initialData) return notFound();

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
          <PageHelpDialog content={helpContent.whistleblowing} />
        </div>
        <Button asChild variant="outline">
          <Link href={`/varsling/${initialData.tenantSlug}`} target="_blank">
            <Shield className="mr-2 h-4 w-4" />
            {t("actions.publicPage")}
          </Link>
        </Button>
      </div>

      <WhistleblowingContent initialData={initialData} />
    </div>
  );
}
