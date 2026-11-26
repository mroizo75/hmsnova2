"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentList } from "@/features/documents/components/document-list";
import { PendingApprovalsPanel } from "@/features/documents/components/pending-approvals-panel";
import { AlertTriangle, FileText } from "lucide-react";
import { isDocumentAttention } from "@/lib/document-attention";
import { useTranslations } from "next-intl";
import { fetchDocuments } from "@/server/queries/document.queries";
import { useServerQuery } from "@/hooks/use-server-query";
import { cn } from "@/lib/utils";

type DocumentData = NonNullable<Awaited<ReturnType<typeof fetchDocuments>>>;

interface DocumentsContentProps {
  initialData: DocumentData;
}

export function DocumentsContent({ initialData }: DocumentsContentProps) {
  const t = useTranslations("dashboardDocumentsPage");

  const { data } = useServerQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocuments(),
    initialData,
  });

  if (!data) return null;

  const { documents, tenantId, currentUserId, canApproveDocuments } = data;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showingPending = searchParams.get("status") === "DRAFT";
  const pending = documents.filter((d: { status: string }) => d.status === "DRAFT");

  const stats = {
    total: documents.length,
    attention: documents.filter((d: any) => isDocumentAttention(d)).length,
    draft: pending.length,
    approved: documents.filter((d: any) => d.status === "APPROVED").length,
    archived: documents.filter((d: any) => d.status === "ARCHIVED").length,
  };

  const togglePending = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (showingPending) params.delete("status");
    else params.set("status", "DRAFT");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      <PendingApprovalsPanel
        documents={pending.map((document: any) => ({
          id: document.id,
          title: document.title,
          kind: document.kind,
          version: document.version,
          owner: document.owner ?? null,
        }))}
        currentUserId={currentUserId}
        canApprove={Boolean(canApproveDocuments)}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">{t("stats.attention")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.attention}</div>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={togglePending}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              togglePending();
            }
          }}
          className={cn("h-full cursor-pointer", showingPending && "border-amber-400")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.draft")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.draft}</div>
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

      <DocumentList
        documents={documents}
        tenantId={tenantId}
        currentUserId={currentUserId}
        canApprove={Boolean(canApproveDocuments)}
      />
    </>
  );
}
