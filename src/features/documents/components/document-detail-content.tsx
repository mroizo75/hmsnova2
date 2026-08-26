"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentSignatureSection } from "@/features/documents/components/document-signature-section";
import { Clock, CheckCircle2, Calendar, User, Tag, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchDocumentDetail } from "@/server/queries/document.queries";
import { getPermissions } from "@/lib/permissions";

type DocumentDetailData = NonNullable<Awaited<ReturnType<typeof fetchDocumentDetail>>>;

function formatDate(date: string | Date | null | undefined, locale: string, fallback: string) {
  if (!date) return fallback;
  return new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800";
    case "UNDER_REVIEW":
      return "bg-yellow-100 text-yellow-800";
    case "APPROVED":
      return "bg-green-100 text-green-800";
    case "OBSOLETE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

interface DocumentDetailContentProps {
  initialData: DocumentDetailData;
  locale: string;
  kindLabels: Record<string, string>;
}

export function DocumentDetailContent({ initialData, locale, kindLabels }: DocumentDetailContentProps) {
  const t = useTranslations("dashboardDocumentDetailPage");

  const { data } = useQuery({
    queryKey: ["documents", initialData.document.id],
    queryFn: () => fetchDocumentDetail(initialData.document.id),
    initialData,
  });

  if (!data) return null;

  const { document, currentUserId, userRole } = data;
  const permissions = getPermissions(userRole as any);

  const statusLabels: Record<string, string> = {
    DRAFT: t("status.draft"),
    UNDER_REVIEW: t("status.underReview"),
    APPROVED: t("status.approved"),
    OBSOLETE: t("status.obsolete"),
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("status.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(document.status)}>
              {statusLabels[document.status] || document.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("documentType.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span>{document.template?.name || kindLabels[document.kind] || document.kind || t("document")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("category.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{document.template?.category || "GENERAL"}</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("details.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("details.owner")}</p>
                <p className="text-sm text-muted-foreground">
                  {document.owner?.name || document.owner?.email || t("dash")}
                </p>
                <p className="text-xs text-muted-foreground">{t("details.created", { date: formatDate(document.createdAt, locale, t("dash")) })}</p>
              </div>
            </div>

            {document.approvedBy && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t("details.approvedBy")}</p>
                  <p className="text-sm text-muted-foreground">
                    {document.approvedByUser?.name || document.approvedByUser?.email || t("dash")}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(document.approvedAt, locale, t("dash"))}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("details.lastUpdated")}</p>
                <p className="text-sm text-muted-foreground">{formatDate(document.updatedAt, locale, t("dash"))}</p>
              </div>
            </div>

            {document.nextReviewDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t("details.nextReview")}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(document.nextReviewDate, locale, t("dash"))}</p>
                  {document.reviewIntervalMonths && (
                    <p className="text-xs text-muted-foreground">
                      {t("details.everyMonths", { months: document.reviewIntervalMonths })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* IK-HMS § 5 */}
      <DocumentSignatureSection
        documentId={document.id}
        signatures={document.signatures.map((s: any) => ({
          ...s,
          signedAt: typeof s.signedAt === "string" ? s.signedAt : new Date(s.signedAt).toISOString(),
        }))}
        canSign={permissions.canReadDocuments}
        canApprove={permissions.canApproveDocuments}
        currentUserId={currentUserId}
      />

      {document.versions && document.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("history.title")}</CardTitle>
            <CardDescription>{t("history.latest", { count: document.versions.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {document.versions.map((version: any) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">{t("version", { version: version.version })}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(version.createdAt, locale, t("dash"))}
                      {version.changeComment && ` · ${version.changeComment}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/api/documents/versions/${version.id}/download`} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
            {document.versions.length >= 5 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t("history.onlyLastFive")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
