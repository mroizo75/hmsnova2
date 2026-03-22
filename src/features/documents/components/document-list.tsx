"use client";

import { Document } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, CheckCircle, Trash2, Upload, Calendar, Edit, FileDown } from "lucide-react";
import Link from "next/link";
import { deleteDocument, getDocumentDownloadUrl, approveDocument, convertDocumentToPDFAction } from "@/server/actions/document.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";

type DocumentWithMeta = Document & {
  owner?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  template?: {
    id: string;
    name: string;
  } | null;
};

interface DocumentListProps {
  documents: DocumentWithMeta[];
  tenantId: string;
  currentUserId?: string;
}

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  DRAFT: "secondary",
  APPROVED: "default",
  ARCHIVED: "destructive",
};

const formatDate = (value: string | Date | null | undefined, locale: string) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale === "en" ? "en-US" : "nb-NO");
};

export function DocumentList({ documents, tenantId, currentUserId }: DocumentListProps) {
  const t = useTranslations("dashboardDocumentsList");
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    const result = await getDocumentDownloadUrl(id);
    if (result.success && result.data) {
      window.open(result.data.url, "_blank");
      toast({
        title: t("toasts.downloading.title"),
        description: t("toasts.downloading.description"),
      });
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.downloadError.title"),
        description: result.error || t("toasts.downloadError.description"),
      });
    }
  };

  const handleConvertToPDF = async (id: string, title: string) => {
    setLoading(id);
    toast({
      title: t("toasts.converting.title"),
      description: t("toasts.converting.description"),
    });

    const result = await convertDocumentToPDFAction(id);
    
    if (result.success && result.data) {
      window.open(result.data.url, "_blank");
      toast({
        title: t("toasts.converted.title"),
        description: t("toasts.converted.description", { title }),
        className: "bg-green-50 border-green-200",
      });
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.convertError.title"),
        description: result.error || t("toasts.convertError.description"),
      });
    }
    setLoading(null);
  };

  const handleApprove = async (id: string, title: string) => {
    if (!confirm(t("confirmApprove", { title }))) {
      return;
    }

    setLoading(id);
    const result = await approveDocument({
      id,
      approvedBy: currentUserId || "system",
    });

    if (result.success) {
      toast({
        title: t("toasts.approved.title"),
        description: t("toasts.approved.description", { title }),
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.approveError.title"),
        description: result.error || t("toasts.approveError.description"),
      });
    }
    setLoading(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(t("confirmDelete", { title }))) {
      return;
    }

    setLoading(id);
    const result = await deleteDocument(id);
    if (result.success) {
      toast({
        title: t("toasts.deleted.title"),
        description: t("toasts.deleted.description", { title }),
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t("toasts.deleteError.title"),
        description: result.error || t("toasts.deleteError.description"),
      });
    }
    setLoading(null);
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">{t("empty.title")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("empty.description")}
        </p>
        <Button asChild>
          <Link href={`/dashboard/documents/new`}>{t("empty.action")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop - Tabell */}
      <div className="hidden md:block rounded-lg border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.title")}</TableHead>
            <TableHead>{t("table.type")}</TableHead>
            <TableHead>{t("table.version")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.owner")}</TableHead>
            <TableHead>{t("table.nextReview")}</TableHead>
            <TableHead>{t("table.visibleTo")}</TableHead>
            <TableHead>{t("table.approved")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const nextReviewDate = doc.nextReviewDate ? new Date(doc.nextReviewDate) : null;
            const isReviewOverdue = nextReviewDate ? nextReviewDate < new Date() : false;

            return (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{doc.title}</span>
                  {doc.template?.name && (
                    <Badge variant="outline" className="text-xs">
                      {doc.template.name}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{t(`kind.${doc.kind}`)}</Badge>
              </TableCell>
              <TableCell>{doc.version}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[doc.status]}>{t(`status.${doc.status}`)}</Badge>
              </TableCell>
              <TableCell>
                {doc.owner?.name || doc.owner?.email ? (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {doc.owner?.name || doc.owner?.email}
                    </span>
                    {doc.owner?.email && doc.owner?.name && (
                      <span className="text-xs text-muted-foreground">{doc.owner.email}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("notSet")}</span>
                )}
              </TableCell>
              <TableCell>
                {nextReviewDate ? (
                  <span className={`text-sm ${isReviewOverdue ? "text-destructive font-medium" : ""}`}>
                    {formatDate(nextReviewDate, locale)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("dash")}</span>
                )}
              </TableCell>
              <TableCell>
                {(() => {
                  try {
                    const roles = doc.visibleToRoles ? (typeof doc.visibleToRoles === "string" ? JSON.parse(doc.visibleToRoles) : doc.visibleToRoles) : null;
                    if (!roles || roles.length === 0) {
                      return <span className="text-sm text-muted-foreground">{t("all")}</span>;
                    }
                    return (
                      <div className="flex flex-wrap gap-1">
                        {roles.slice(0, 2).map((role: string) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {t(`roles.${role}`)}
                          </Badge>
                        ))}
                        {roles.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{roles.length - 2}</span>
                        )}
                      </div>
                    );
                  } catch {
                    return <span className="text-sm text-muted-foreground">{t("all")}</span>;
                  }
                })()}
              </TableCell>
              <TableCell>
                {doc.approvedAt ? (
                  <span className="text-sm text-muted-foreground">{formatDate(doc.approvedAt, locale)}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("dash")}</span>
                )}
              </TableCell>
              <TableCell>{formatDate(doc.createdAt, locale)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.id)}
                      title={t("actions.download")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {(doc.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                    doc.mime === "application/msword") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConvertToPDF(doc.id, doc.title)}
                      disabled={loading === doc.id}
                      title={t("actions.convertPdf")}
                    >
                      <FileDown className="h-4 w-4 text-blue-600" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title={t("actions.edit")}
                  >
                    <Link href={`/dashboard/documents/${doc.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  
                  {doc.status === "DRAFT" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprove(doc.id, doc.title)}
                      disabled={loading === doc.id}
                      title={t("actions.approve")}
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}

                  {doc.status === "APPROVED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      title={t("actions.newVersion")}
                    >
                      <Link href={`/dashboard/documents/${doc.id}/new-version`}>
                        <Upload className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id, doc.title)}
                    disabled={doc.kind === "LAW" || loading === doc.id}
                    title={doc.kind === "LAW" ? t("cannotDeleteLaw") : t("actions.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {/* Mobile - Kort */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => {
          const nextReviewDate = doc.nextReviewDate ? new Date(doc.nextReviewDate) : null;
          const isReviewOverdue = nextReviewDate ? nextReviewDate < new Date() : false;

          return (
          <Card key={doc.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h3 className="font-medium line-clamp-2">{doc.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>v{doc.version}</span>
                        <span>•</span>
                        <span>{formatDate(doc.createdAt, locale)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusVariants[doc.status]} className="shrink-0">
                    {t(`status.${doc.status}`)}
                  </Badge>
                </div>

            <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{t(`kind.${doc.kind}`)}</Badge>
                {doc.template?.name && (
                  <Badge variant="secondary" className="text-xs">
                    {doc.template.name}
                  </Badge>
                )}
                  {doc.approvedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                    {t("approvedAt", { date: formatDate(doc.approvedAt, locale) })}
                    </div>
                  )}
                </div>

                {/* Synlig for roller */}
                <div className="mt-2">
                  {(() => {
                    try {
                      const roles = doc.visibleToRoles ? (typeof doc.visibleToRoles === "string" ? JSON.parse(doc.visibleToRoles) : doc.visibleToRoles) : null;
                      if (!roles || roles.length === 0) {
                        return (
                          <span className="text-xs text-muted-foreground">
                            👥 {t("visibleForAll")}
                          </span>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-muted-foreground">👥</span>
                          {roles.map((role: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {t(`roles.${role}`)}
                            </Badge>
                          ))}
                        </div>
                      );
                    } catch {
                      return (
                        <span className="text-xs text-muted-foreground">
                          👥 {t("visibleForAll")}
                        </span>
                      );
                    }
                  })()}
                </div>

                <div className="border-t pt-3 text-sm">
                  <p className="text-xs text-muted-foreground">{t("owner")}</p>
                  <p className="font-medium">
                    {doc.owner?.name || doc.owner?.email || t("notSet")}
                  </p>
                </div>

                <div className="border-t pt-3 text-sm">
                  <p className="text-xs text-muted-foreground">{t("nextReview")}</p>
                  <p className={`font-medium ${isReviewOverdue ? "text-destructive" : ""}`}>
                    {formatDate(nextReviewDate, locale) ?? t("notSet")}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.id)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t("actions.download")}
                    </Button>

                    {(doc.mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                      doc.mime === "application/msword") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConvertToPDF(doc.id, doc.title)}
                        disabled={loading === doc.id}
                        className="flex-1"
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/dashboard/documents/${doc.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t("actions.edit")}
                      </Link>
                    </Button>
                    
                    {doc.status === "DRAFT" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(doc.id, doc.title)}
                        disabled={loading === doc.id}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t("actions.approve")}
                      </Button>
                    )}

                    {doc.status === "APPROVED" && (
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/dashboard/documents/${doc.id}/new-version`}>
                          <Upload className="h-4 w-4 mr-2" />
                          {t("actions.newVersion")}
                        </Link>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id, doc.title)}
                      disabled={doc.kind === "LAW" || loading === doc.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </>
  );
}
