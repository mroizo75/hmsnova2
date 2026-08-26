import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";
import { DocumentsContent } from "@/features/documents/components/documents-content";
import { fetchDocuments } from "@/server/queries/document.queries";

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

  const initialData = await fetchDocuments();

  if (!initialData) {
    return <div>{t("noTenantAccess")}</div>;
  }

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

      <DocumentsContent initialData={initialData} />
    </div>
  );
}
