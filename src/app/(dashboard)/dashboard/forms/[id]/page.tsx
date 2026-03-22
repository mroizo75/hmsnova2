import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Pencil, 
  Download, 
  TrendingUp, 
  Users, 
  Calendar,
  Briefcase,
  FileText,
  Eye
} from "lucide-react";
import Link from "next/link";
import { CopyFormButton } from "@/components/forms/copy-form-button";
import { DeleteFormButton } from "@/components/forms/delete-form-button";
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
import { getPermissions } from "@/lib/permissions";
import { tenantCanUseGlobalFormTemplate } from "@/lib/form-template-industry";

const ITEMS_PER_PAGE = 20;

export default async function FormDetailPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    returnUrl?: string;
    projectId?: string;
    allTemplates?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const queryParams = await searchParams;
  const returnUrl = queryParams.returnUrl ?? "/dashboard/forms";
  const projectId = queryParams.projectId;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const currentPage = parseInt(queryParams.page || "1", 10);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;
  const userTenant = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    },
    select: { role: true },
  });
  const permissions = getPermissions(userTenant?.role ?? "ANSATT");

  const form = await prisma.formTemplate.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          submissions: {
            where: {
              tenantId: session.user.tenantId, // VIKTIG: Kun tenant-spesifikke submissions
            },
          },
        },
      },
    },
  });

  if (!form) {
    redirect("/dashboard/forms");
  }

  // Sjekk tilgang: enten eier av skjemaet eller globalt skjema
  if (form.tenantId && form.tenantId !== session.user.tenantId) {
    redirect("/dashboard/forms");
  }

  const tenantRow = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { industry: true },
  });
  const allTemplatesView = queryParams.allTemplates === "1";
  if (
    !tenantCanUseGlobalFormTemplate(form, tenantRow?.industry ?? null, {
      allTemplatesView,
    })
  ) {
    redirect("/dashboard/forms");
  }

  const formDetailPreserved = new URLSearchParams();
  if (queryParams.returnUrl) {
    formDetailPreserved.set("returnUrl", queryParams.returnUrl);
  }
  if (projectId) {
    formDetailPreserved.set("projectId", projectId);
  }
  if (allTemplatesView) {
    formDetailPreserved.set("allTemplates", "1");
  }
  const withFormDetailPage = (page: number) => {
    const next = new URLSearchParams(formDetailPreserved);
    next.set("page", String(page));
    return `/dashboard/forms/${id}?${next.toString()}`;
  };

  const fillSearchParams = new URLSearchParams({
    returnUrl: projectId ? `/dashboard/projects/${projectId}` : `/dashboard/forms/${form.id}`,
  });
  if (projectId) {
    fillSearchParams.set("projectId", projectId);
  }
  if (allTemplatesView) {
    fillSearchParams.set("allTemplates", "1");
  }

  const restrictedGlobalView = form.isGlobal && !permissions.canManageForms;

  // Hent submissions med paginering (KUN for denne tenanten)
  const submissions = await prisma.formSubmission.findMany({
    where: { 
      formTemplateId: id,
      tenantId: session.user.tenantId,
      ...(restrictedGlobalView ? { submittedById: session.user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      fieldValues: true,
      submittedBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, code: true } },
    },
    skip,
    take: ITEMS_PER_PAGE,
  });

  const submittedByIds = submissions
    .map((s) => s.submittedById)
    .filter((id): id is string => id != null);
  const userTenants =
    submittedByIds.length > 0
      ? await prisma.userTenant.findMany({
          where: {
            userId: { in: submittedByIds },
            tenantId: session.user.tenantId,
          },
          select: { userId: true, displayName: true },
        })
      : [];
  const displayNameMap = new Map(
    userTenants.map((ut) => [ut.userId, ut.displayName ?? null])
  );

  const visibleSubmissionCount = restrictedGlobalView
    ? await prisma.formSubmission.count({
        where: {
          formTemplateId: id,
          tenantId: session.user.tenantId,
          submittedById: session.user.id,
        },
      })
    : form._count.submissions;
  const totalVisiblePages = Math.ceil(visibleSubmissionCount / ITEMS_PER_PAGE);

  // Hent alle submissions for statistikk (KUN for denne tenanten)
  const allSubmissions = await prisma.formSubmission.findMany({
    where: { 
      formTemplateId: id,
      tenantId: session.user.tenantId,
      ...(restrictedGlobalView ? { submittedById: session.user.id } : {}),
    },
    select: {
      createdAt: true,
      status: true,
    },
  });

  // Beregn statistikk
  const submissionsThisMonth = allSubmissions.filter((s) => {
    const date = new Date(s.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const submissionsThisWeek = allSubmissions.filter((s) => {
    const date = new Date(s.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }).length;

  // Completion rate
  const completedSubmissions = allSubmissions.filter((s) => s.status === "SUBMITTED" || s.status === "APPROVED").length;
  const completionRate = visibleSubmissionCount > 0 ? Math.round((completedSubmissions / visibleSubmissionCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={returnUrl}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{form.title}</h1>
            {form.description && (
              <p className="text-muted-foreground mt-1">{form.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/forms/${form.id}/fill?${fillSearchParams.toString()}`}>
            <Button variant="default" className="bg-green-600 hover:bg-green-700">
              <FileText className="h-4 w-4 mr-2" />
              Fyll ut skjema
            </Button>
          </Link>
          {form.isGlobal ? (
            <CopyFormButton formId={form.id} formTitle={form.title} />
          ) : (
            <>
              {permissions.canManageForms && form.allowTenantDeletion ? (
                <Link href={`/dashboard/forms/${form.id}/edit`}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Rediger
                  </Button>
                </Link>
              ) : null}
              {permissions.canManageForms && form.allowTenantDeletion ? (
                <DeleteFormButton
                  formId={form.id}
                  formTitle={form.title}
                  submissionCount={form._count.submissions}
                  returnUrl={returnUrl}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totalt antall
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Denne måneden
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Denne uken
              </CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fullføringsrate
              </CardTitle>
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

      {/* Form details */}
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
              {form.fields.map((field, index) => (
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

      {/* Submissions list */}
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
                    href={
                      allTemplatesView
                        ? `/api/forms/${form.id}/submissions/export?allTemplates=1`
                        : `/api/forms/${form.id}/submissions/export`
                    }
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
                    {form.category === "TIMESHEET" && (
                      <TableHead>Navn</TableHead>
                    )}
                    <TableHead>Prosjekt</TableHead>
                    <TableHead>Dato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Antall felt utfylt</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => {
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

              {/* Pagination */}
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
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationLink href={withFormDetailPage(currentPage - 1)}>
                            {currentPage - 1}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationLink href={withFormDetailPage(currentPage)} isActive>
                          {currentPage}
                        </PaginationLink>
                      </PaginationItem>

                      {currentPage < totalVisiblePages && (
                        <PaginationItem>
                          <PaginationLink href={withFormDetailPage(currentPage + 1)}>
                            {currentPage + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      {currentPage < totalVisiblePages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {currentPage < totalVisiblePages - 1 && (
                        <PaginationItem>
                          <PaginationLink href={withFormDetailPage(totalVisiblePages)}>
                            {totalVisiblePages}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href={
                            currentPage < totalVisiblePages
                              ? withFormDetailPage(currentPage + 1)
                              : "#"
                          }
                          aria-disabled={currentPage === totalVisiblePages}
                          className={
                            currentPage === totalVisiblePages ? "pointer-events-none opacity-50" : ""
                          }
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
    </div>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CUSTOM: "Egendefinert",
    MEETING: "Møtereferat",
    INSPECTION: "Inspeksjon",
    INCIDENT: "Hendelsesrapport",
    RISK: "Risikovurdering",
    TRAINING: "Opplæring",
    CHECKLIST: "Sjekkliste",
    TIMESHEET: "Timeliste",
    WELLBEING: "Psykososialt arbeidsmiljø",
  };
  return labels[category] || category;
}

function getAccessTypeLabel(accessType: string): string {
  const labels: Record<string, string> = {
    ALL: "Alle ansatte",
    ROLES: "Spesifikke roller",
    USERS: "Spesifikke brukere",
    ROLES_AND_USERS: "Roller + brukere",
  };
  return labels[accessType] || accessType;
}

function getFieldTypeLabel(fieldType: string): string {
  const labels: Record<string, string> = {
    TEXT: "Kort tekst",
    TEXTAREA: "Lang tekst",
    NUMBER: "Tall",
    DATE: "Dato",
    DATETIME: "Dato og tid",
    PROJECT: "Prosjekt",
    CHECKBOX: "Avkrysning",
    RADIO: "Radioknapper",
    SELECT: "Rullegardin",
    FILE: "Fil",
    SIGNATURE: "Signatur",
    LIKERT_SCALE: "Likert-skala (1-5)",
    SECTION_HEADER: "Seksjonsoverskrift",
  };
  return labels[fieldType] || fieldType;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Kladd",
    SUBMITTED: "Innsendt",
    APPROVED: "Godkjent",
    REJECTED: "Avvist",
  };
  return labels[status] || status;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    DRAFT: "secondary",
    SUBMITTED: "default",
    APPROVED: "default",
    REJECTED: "destructive",
  };
  return variants[status] || "outline";
}
