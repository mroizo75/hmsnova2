import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";
import { fetchChemicals } from "@/server/queries/chemical.queries";
import { ChemicalsContent } from "@/features/chemicals/components/chemicals-content";

export default async function ChemicalsPage({
  searchParams,
}: {
  searchParams: Promise<{ isocyanates?: string; filter?: string }>;
}) {
  const t = await getTranslations("dashboardChemicalsPage");
  const params = await searchParams;
  const initialIsocyanateFilter = params?.isocyanates === "1" ? "only" : undefined;
  const initialQuickFilter =
    params?.filter === "missingSds"
      ? "missingSds"
      : params?.filter === "needsReview"
        ? "needsReview"
        : params?.filter === "overdue"
          ? "overdue"
          : undefined;
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
    return <div>{t("notLinkedTenant")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  const initialData = await fetchChemicals();

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.chemicals} />
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/chemicals/isocyanate-scan">
            <Button variant="outline" className="w-full sm:w-auto">
              <Search className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("actions.scanIsocyanates")}</span>
              <span className="sm:hidden">{t("actions.scanShort")}</span>
            </Button>
          </Link>
          <Link href="/dashboard/chemicals/new">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t("actions.register")}
            </Button>
          </Link>
        </div>
      </div>

      {/* HMS Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">
                {t("requirements.title")}
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>{t("requirements.r1")}</li>
                <li>{t("requirements.r2")}</li>
                <li>{t("requirements.r3")}</li>
                <li>{t("requirements.r4")}</li>
                <li>{t("requirements.r5")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChemicalsContent
        initialData={initialData}
        initialIsocyanateFilter={initialIsocyanateFilter}
        initialQuickFilter={initialQuickFilter}
      />
    </div>
  );
}
