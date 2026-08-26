import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Download, Edit } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DocumentDetailContent } from "@/features/documents/components/document-detail-content";
import { fetchDocumentDetail } from "@/server/queries/document.queries";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("dashboardDocumentDetailPage");
  const locale = await getLocale();
  const kindLabels: Record<string, string> = {
    LAW: t("kinds.LAW"),
    PROCEDURE: t("kinds.PROCEDURE"),
    CHECKLIST: t("kinds.CHECKLIST"),
    FORM: t("kinds.FORM"),
    SDS: t("kinds.SDS"),
    PLAN: t("kinds.PLAN"),
    OTHER: t("kinds.OTHER"),
  };
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const initialData = await fetchDocumentDetail(id);

  if (!initialData) {
    redirect("/dashboard/documents");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">{initialData.document.title}</h1>
              <p className="text-muted-foreground">{t("version", { version: initialData.document.version })}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/documents/${initialData.document.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {t("actions.edit")}
            </Link>
          </Button>
          <Button asChild>
            <a href={`/api/documents/${initialData.document.id}/download`} download>
              <Download className="h-4 w-4 mr-2" />
              {t("actions.download")}
            </a>
          </Button>
        </div>
      </div>

      <DocumentDetailContent
        initialData={initialData}
        locale={locale}
        kindLabels={kindLabels}
      />
    </div>
  );
}
