"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  TrendingUp,
  Users,
  Calendar,
  Briefcase,
  FileText,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { CopyFormButton } from "@/components/forms/copy-form-button";
import { TimesheetExportDropdown } from "@/components/forms/timesheet-export-dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { fetchFormDetail } from "@/server/queries/form.queries";

type FormDetailData = NonNullable<Awaited<ReturnType<typeof fetchFormDetail>>>;

interface FormDetailContentProps {
  initialData: FormDetailData;
  formId: string;
  currentPage: number;
  allTemplatesView: boolean;
}

const ITEMS_PER_PAGE = 20;

export function FormDetailContent({
  initialData,
  formId,
  currentPage,
  allTemplatesView,
}: FormDetailContentProps) {
  const { data } = useQuery({
    queryKey: ["forms", formId],
    queryFn: () => fetchFormDetail(formId),
    initialData,
  });

  if (!data) return null;

  const { form, submissions, userTenants, visibleSubmissionCount, allSubmissions, restrictedGlobalView, permissions } = data;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;
  const totalVisiblePages = Math.ceil(visibleSubmissionCount / ITEMS_PER_PAGE);
  const displayNameMap = new Map(userTenants.map((ut: any) => [ut.userId, ut.displayName ?? null]));

  const submissionsThisMonth = allSubmissions.filter((s: any) => {
    const date = new Date(s.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const submissionsThisWeek = allSubmissions.filter((s: any) => {
    const date = new Date(s.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }).length;

  const completedSubmissions = allSubmissions.filter((s: any) => s.status === "SUBMITTED" || s.status === "APPROVED").length;
  const completionRate = visibleSubmissionCount > 0 ? Math.round((completedSubmissions / visibleSubmissionCount) * 100) : 0;

  const withFormDetailPage = (page: number) => {
    const params = new URLSearchParams();
    if (allTemplatesView) params.set("allTemplates", "1");
    params.set("page", String(page));
    return `/dashboard/forms/${formId}?${params.toString()}`;
  };

  return (
    <>
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Totalt antall</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visibleSubmissionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {restrictedGlobalView ? "Dine utfyllinger" : "Utfyllinger totalt"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Denne måneden</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissionsThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Siste 30 dager</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Denne uken</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissionsThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">Siste 7 dager</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fullføringsrate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedSubmissions} av {visibleSubmissionCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {form.isGlobal && (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50">
          <CardContent className="p-4 text-sm text-purple-900">
            <p>
              <strong>Eksempelmal:</strong> Dette er en global standardmal. Hvis du vil endre
              punkter, bruk <strong>Kopier</strong> og rediger den kopierte malen.
            </p>
            <p className="mt-2">
              {restrictedGlobalView
                ? "Du ser kun dine egne utfyllinger på denne malen."
                : "Du ser alle utfyllinger i virksomheten for denne malen."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Skjema-detaljer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kategori</span>
              <Badge variant="outline">{getCategoryLabel(form.category)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {form.isActive ? (
                <Badge className="bg-green-100 text-green-700">Aktiv</Badge>
              ) : (
                <Badge variant="secondary">Inaktiv</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Antall felt</span>
              <span className="font-medium">{form.fields.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Krever signatur</span>
              <Badge variant={form.requiresSignature ? "default" : "outline"}>
                {form.requiresSignature ? "Ja" : "Nei"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Krever godkjenning</span>
              <Badge variant={form.requiresApproval ? "default" : "outline"}>
                {form.requiresApproval ? "Ja" : "Nei"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tilgang</span>
              <Badge variant="outline">{getAccessTypeLabel(form.accessType)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Felt i skjemaet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {form.fields.map((field: any, index: number) => (
                <div key={field.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">{getFieldTypeLabel(field.fieldType)}</p>
                  </div>
                  {field.isRequired && (
                    <Badge variant="destructive" className="text-xs">Påkrevd</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {restrictedGlobalView ? "Dine innsendte svar" : "Innsendte svar"} ({visibleSubmissionCount})
              </CardTitle>
              {visibleSubmissionCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Viser {skip + 1}-{Math.min(skip + ITEMS_PER_PAGE, visibleSubmissionCount)} av {visibleSubmissionCount}
                </p>
              )}
            </div>
            {visibleSubmissionCount > 0 &&
              (form.category === "TIMESHEET" ? (
                <TimesheetExportDropdown
                  formId={form.id}
                  formTitle={form.title}
                  allTemplatesView={allTemplatesView}
                />
              ) : (
                <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                  <a
                    href={allTemplatesView ? `/api/forms/${form.id}/submissions/export?allTemplates=1` : `/api/forms/${form.id}/submissions/export`}
                    download
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Eksporter til Excel
                  </a>
                </Button>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          {visibleSubmissionCount === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">Ingen utfyllinger ennå</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Referanse</TableHead>
                    {form.category === "TIMESHEET" && <TableHead>Navn</TableHead>}
                    <TableHead>Prosjekt</TableHead>
                    <TableHead>Dato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Antall felt utfylt</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission: any) => {
                    const displayName =
                      form.category === "TIMESHEET"
                        ? (submission.submittedById == null
                            ? "–"
                            : displayNameMap.get(submission.submittedById) ||
                              submission.submittedBy?.name ||
                              submission.submittedBy?.email ||
                              "–")
                        : null;
                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {submission.submissionNumber || "–"}
                        </TableCell>
                        {form.category === "TIMESHEET" && (
                          <TableCell className="font-medium">{displayName}</TableCell>
                        )}
                        <TableCell>
                          {submission.project ? (
                            <Link href={`/dashboard/projects/${submission.project.id}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                              <Briefcase className="h-3.5 w-3.5" />
                              <span>{submission.project.name}</span>
                              {submission.project.code && (
                                <span className="text-xs text-muted-foreground">({submission.project.code})</span>
                              )}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(submission.createdAt).toLocaleDateString("nb-NO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(submission.status)}>
                            {getStatusLabel(submission.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.fieldValues.length} / {form.fields.length}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/dashboard/forms/${form.id}/submissions/${submission.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Se
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" title="Last ned som PDF" asChild>
                              <a href={`/api/forms/${form.id}/submissions/${submission.id}/pdf`} download>
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalVisiblePages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={currentPage > 1 ? withFormDetailPage(currentPage - 1) : "#"}
                          aria-disabled={currentPage === 1}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {currentPage > 2 && (
                        <PaginationItem>
                          <PaginationLink href={withFormDetailPage(1)}>1</PaginationLink>
                        </PaginationItem>
                      )}
                      {currentPage > 3 && (
                        <PaginationItem><PaginationEllipsis /></PaginationItem>
                      )}
                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationLink href={withFormDetailPage(currentPage - 1)}>{currentPage - 1}</PaginationLink>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink href={withFormDetailPage(currentPage)} isActive>{currentPage}</PaginationLink>
                      </PaginationItem>
                      {currentPage < totalVisiblePages && (
                        <PaginationItem>
                          <PaginationLink href={withFormDetailPage(currentPage + 1)}>{currentPage + 1}</PaginationLink>
                        </PaginationItem>
                      )}
                      {currentPage < totalVisiblePages - 2 && (
                        <PaginationItem><PaginationEllipsis /></PaginationItem>
                      )}
                      {currentPage < totalVisiblePages - 1 && (
                        <PaginationItem>
                          <PaginationLink href={withFormDetailPage(totalVisiblePages)}>{totalVisiblePages}</PaginationLink>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href={currentPage < totalVisiblePages ? withFormDetailPage(currentPage + 1) : "#"}
                          aria-disabled={currentPage === totalVisiblePages}
                          className={currentPage === totalVisiblePages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CUSTOM: "Egendefinert", MEETING: "Møtereferat", INSPECTION: "Inspeksjon",
    INCIDENT: "Hendelsesrapport", RISK: "Risikovurdering", TRAINING: "Opplæring",
    CHECKLIST: "Sjekkliste", TIMESHEET: "Timeliste", WELLBEING: "Psykososialt arbeidsmiljø",
  };
  return labels[category] || category;
}

function getAccessTypeLabel(accessType: string): string {
  const labels: Record<string, string> = {
    ALL: "Alle ansatte", ROLES: "Spesifikke roller", USERS: "Spesifikke brukere",
    ROLES_AND_USERS: "Roller + brukere",
  };
  return labels[accessType] || accessType;
}

function getFieldTypeLabel(fieldType: string): string {
  const labels: Record<string, string> = {
    TEXT: "Kort tekst", TEXTAREA: "Lang tekst", NUMBER: "Tall", DATE: "Dato",
    DATETIME: "Dato og tid", PROJECT: "Prosjekt", CHECKBOX: "Avkrysning",
    RADIO: "Radioknapper", SELECT: "Rullegardin", FILE: "Fil", SIGNATURE: "Signatur",
    LIKERT_SCALE: "Likert-skala (1-5)", SECTION_HEADER: "Seksjonsoverskrift",
  };
  return labels[fieldType] || fieldType;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = { DRAFT: "Kladd", SUBMITTED: "Innsendt", APPROVED: "Godkjent", REJECTED: "Avvist" };
  return labels[status] || status;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "secondary", SUBMITTED: "default", APPROVED: "default", REJECTED: "destructive",
  };
  return variants[status] || "outline";
}
