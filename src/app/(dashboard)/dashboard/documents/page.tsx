import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/features/documents/components/document-list";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";

export default async function DocumentsPage() {
  const t = await getTranslations("dashboardDocumentsPage");
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const documents = await prisma.document.findMany({
    where: { tenantId: userTenant.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      template: {
        select: { id: true, name: true },
      },
    },
  });

  const stats = {
    total: documents.length,
    draft: documents.filter(d => d.status === "DRAFT").length,
    approved: documents.filter(d => d.status === "APPROVED").length,
    archived: documents.filter(d => d.status === "ARCHIVED").length,
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.documents} />
        </div>
        <Button asChild>
          <Link href="/dashboard/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newDocument")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.draft")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.approved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.archived")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archived}</div>
          </CardContent>
        </Card>
      </div>

      <DocumentList documents={documents} tenantId={userTenant.tenantId} currentUserId={user.id} />
    </div>
  );
}
