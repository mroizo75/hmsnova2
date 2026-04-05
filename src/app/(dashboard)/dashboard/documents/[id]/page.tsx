import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Download, Edit, Clock, CheckCircle2, AlertCircle, Calendar, User, Tag } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DocumentSignatureSection } from "@/features/documents/components/document-signature-section";
import { getPermissions } from "@/lib/permissions";

function formatDate(date: Date | null | undefined, locale: string, fallback: string) {
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

function getStatusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>) {
  const labels: Record<string, string> = {
    DRAFT: t("status.draft"),
    UNDER_REVIEW: t("status.underReview"),
    APPROVED: t("status.approved"),
    OBSOLETE: t("status.obsolete"),
  };
  return labels[status] || status;
}

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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    redirect("/login");
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    redirect("/login");
  }

  const tenantId = selectedMembership.tenantId;

  const document = await prisma.document.findUnique({
    where: {
      id,
      tenantId,
    },
    include: {
      template: true,
      versions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      signatures: {
        include: {
          signedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ role: "asc" }, { signedAt: "asc" }],
      },
      approvedByUser: {
        select: { name: true, email: true },
      },
      owner: {
        select: { name: true, email: true },
      },
    },
  });

  if (!document) {
    redirect("/dashboard/documents");
  }

  const permissions = getPermissions(selectedMembership.role);
  const currentUserId = user.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">{document.title}</h1>
              <p className="text-muted-foreground">{t("version", { version: document.version })}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/documents/${document.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {t("actions.edit")}
            </Link>
          </Button>
          <Button asChild>
            <a href={`/api/documents/${document.id}/download`} download>
              <Download className="h-4 w-4 mr-2" />
              {t("actions.download")}
            </a>
          </Button>
        </div>
      </div>

      {/* Status og metadata */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("status.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(document.status)}>
              {getStatusLabel(document.status, t)}
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

      {/* Detaljer */}
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

      {/* Signaturside – IK-HMS § 5 */}
      <DocumentSignatureSection
        documentId={document.id}
        signatures={document.signatures.map((s) => ({
          ...s,
          signedAt: s.signedAt.toISOString(),
        }))}
        canSign={permissions.canReadDocuments}
        canApprove={permissions.canApproveDocuments}
        currentUserId={currentUserId}
      />

      {/* Versjonshistorikk */}
      {document.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("history.title")}</CardTitle>
            <CardDescription>{t("history.latest", { count: document.versions.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {document.versions.map((version) => (
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
    </div>
  );
}
