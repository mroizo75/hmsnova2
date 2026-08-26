"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentList } from "@/features/documents/components/document-list";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchDocuments } from "@/server/queries/document.queries";

type DocumentData = NonNullable<Awaited<ReturnType<typeof fetchDocuments>>>;

interface DocumentsContentProps {
  initialData: DocumentData;
}

export function DocumentsContent({ initialData }: DocumentsContentProps) {
  const t = useTranslations("dashboardDocumentsPage");

  const { data } = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocuments(),
    initialData,
  });

  if (!data) return null;

  const { documents, tenantId, currentUserId } = data;

  const stats = {
    total: documents.length,
    draft: documents.filter((d: any) => d.status === "DRAFT").length,
    approved: documents.filter((d: any) => d.status === "APPROVED").length,
    archived: documents.filter((d: any) => d.status === "ARCHIVED").length,
  };

  return (
    <>
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

      <DocumentList documents={documents} tenantId={tenantId} currentUserId={currentUserId} />
    </>
  );
}
