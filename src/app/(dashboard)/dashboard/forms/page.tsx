import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, TrendingUp, BarChart3, Download, Eye, Pencil, PlayCircle } from "lucide-react";
import Link from "next/link";
import { CopyFormButton } from "@/components/forms/copy-form-button";
import { DeleteFormButton } from "@/components/forms/delete-form-button";
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
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getPermissions } from "@/lib/permissions";
import { tenantCanUseGlobalFormTemplate } from "@/lib/form-template-industry";
import { getLocale, getTranslations } from "next-intl/server";

const ITEMS_PER_PAGE = 10;

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; projectId?: string; q?: string; view?: string }>;
}) {
  const t = await getTranslations("dashboardFormsPage");
  const locale = await getLocale();
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const currentPage = parseInt(params.page || "1", 10);
  const selectedProjectId = params.projectId || null;
  const query = (params.q || "").trim();
  const showAllTemplates = params.view === "all";
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
  const tenantInfo = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { industry: true },
  });
  const tenantIndustry = tenantInfo?.industry ?? null;

  const formSearchFilter =
    query.length > 0
      ? {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        }
      : {};

  // Hent skjemaer (tenant + globale), der bransje-filter brukes som default
  const formsBase = await prisma.formTemplate.findMany({
    where: {
      AND: [
        {
          OR: [{ tenantId: session.user.tenantId }, { isGlobal: true }],
        },
        formSearchFilter,
      ],
    },
    include: {
      _count: {
        select: {
          fields: true,
          submissions: {
            where: {
              tenantId: session.user.tenantId,
            },
          },
        },
      },
      submissions: {
        where: {
          tenantId: session.user.tenantId,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const scopedForms = formsBase.filter((form) =>
    tenantCanUseGlobalFormTemplate(form, tenantIndustry, { allTemplatesView: showAllTemplates })
  );
  const totalForms = scopedForms.length;
  const totalPages = Math.ceil(totalForms / ITEMS_PER_PAGE);
  const forms = await Promise.all(
    scopedForms.slice(skip, skip + ITEMS_PER_PAGE).map(async (form) => {
      const restrictedGlobal = form.isGlobal && !permissions.canManageForms;
      if (!restrictedGlobal) {
        return {
          ...form,
          visibleSubmissionCount: form._count.submissions,
          latestVisibleSubmissionCreatedAt: form.submissions[0]?.createdAt ?? null,
        };
      }

      const [ownSubmissionCount, latestOwnSubmission] = await Promise.all([
        prisma.formSubmission.count({
          where: {
            formTemplateId: form.id,
            tenantId: session.user.tenantId,
            submittedById: session.user.id,
          },
        }),
        prisma.formSubmission.findFirst({
          where: {
            formTemplateId: form.id,
            tenantId: session.user.tenantId,
            submittedById: session.user.id,
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

      return {
        ...form,
        visibleSubmissionCount: ownSubmissionCount,
        latestVisibleSubmissionCreatedAt: latestOwnSubmission?.createdAt ?? null,
      };
    })
  );

  // Beregn stats (alle skjemaer - tenant + globale, men KUN tenant-submissions)
  const allFormsBase = scopedForms;
  const allForms = await Promise.all(
    allFormsBase.map(async (form) => {
      const restrictedGlobal = form.isGlobal && !permissions.canManageForms;
      if (!restrictedGlobal) {
        return {
          ...form,
          visibleSubmissionCount: form._count.submissions,
        };
      }
      const ownSubmissionCount = await prisma.formSubmission.count({
        where: {
          formTemplateId: form.id,
          tenantId: session.user.tenantId,
          submittedById: session.user.id,
        },
      });
      return {
        ...form,
        visibleSubmissionCount: ownSubmissionCount,
      };
    })
  );

  const totalSubmissions = allForms.reduce((sum, form) => sum + form.visibleSubmissionCount, 0);
  const activeForms = allForms.filter((f) => f.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("description")}
            </p>
            {query && (
              <p className="text-sm text-primary mt-1">
                {t("filteredOn")} <strong>{query}</strong>
              </p>
            )}
            {selectedProjectId && (
              <p className="text-sm text-primary mt-1">
                {t("projectLinkActive")}
              </p>
            )}
            {!showAllTemplates && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("industryDefault")}
              </p>
            )}
          </div>
          <PageHelpDialog content={helpContent.forms} />
        </div>
        <div className="flex items-center gap-2">
          <Link href={showAllTemplates ? "/dashboard/forms" : "/dashboard/forms?view=all"}>
            <Button variant="outline" size="lg">
              {showAllTemplates ? t("actions.showIndustry") : t("actions.showAllTemplates")}
            </Button>
          </Link>
          <Link href="/dashboard/forms/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              {t("actions.newForm")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stats.totalForms.title")}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalForms}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("stats.totalForms.active", { count: activeForms })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stats.totalSubmissions.title")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("stats.totalSubmissions.description")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("stats.averagePerForm.title")}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalForms > 0 ? Math.round(totalSubmissions / totalForms) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("stats.averagePerForm.description")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info box */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>{t("tips.title")}</strong> {t("tips.text1")}
          </p>
          <p className="text-sm text-blue-900 mt-2">
            <strong>{t("tips.examplesTitle")}</strong> {t("tips.text2")}
          </p>
        </CardContent>
      </Card>

      {/* Forms table */}
      {totalForms === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {t("empty.description")}
            </p>
            <Link href="/dashboard/forms/new">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                {t("actions.createForm")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("list.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("list.showing", {
                  from: skip + 1,
                  to: Math.min(skip + ITEMS_PER_PAGE, totalForms),
                  total: totalForms,
                })}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.formName")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.access")}</TableHead>
                  <TableHead className="text-right">{t("table.fields")}</TableHead>
                  <TableHead className="text-right">{t("table.submissions")}</TableHead>
                  <TableHead>{t("table.lastUsed")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{form.title}</p>
                          {form.isGlobal && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                              {t("badges.exampleTemplate")}
                            </Badge>
                          )}
                        </div>
                        {form.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(form.category, t)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {form.isActive ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          {t("status.active")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t("status.inactive")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getAccessLabel(form.accessType, form.allowedRoles, form.allowedUsers, t)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">{form._count.fields}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-medium">{form.visibleSubmissionCount}</span>
                        {form.visibleSubmissionCount > 0 && (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {form.latestVisibleSubmissionCreatedAt ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(form.latestVisibleSubmissionCreatedAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("never")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={buildFormDetailHref(
                            form.id,
                            selectedProjectId,
                            showAllTemplates
                          )}
                        >
                          <Button variant="ghost" size="sm" title={t("titles.viewDetails")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link
                          href={buildFormFillHref(
                            form.id,
                            selectedProjectId,
                            showAllTemplates
                          )}
                        >
                          <Button variant="ghost" size="sm" title={t("titles.fillForm")}>
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                        {form.isGlobal ? (
                          <CopyFormButton formId={form.id} formTitle={form.title} />
                        ) : permissions.canManageForms && form.allowTenantDeletion ? (
                          <Link href={`/dashboard/forms/${form.id}/edit`}>
                            <Button variant="ghost" size="sm" title={t("titles.editForm")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        ) : null}
                        {permissions.canManageForms &&
                        !form.isGlobal &&
                        form.allowTenantDeletion ? (
                          <DeleteFormButton
                            compact
                            formId={form.id}
                            formTitle={form.title}
                            submissionCount={form._count.submissions}
                            returnUrl={createFormsPageHref(
                              currentPage,
                              selectedProjectId,
                              query,
                              showAllTemplates
                            )}
                          />
                        ) : null}
                        {form.visibleSubmissionCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t("titles.export")}
                            asChild
                          >
                            <a
                              href={buildFormExportHref(form.id, showAllTemplates)}
                              download
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={
                          currentPage > 1
                            ? createFormsPageHref(
                                currentPage - 1,
                                selectedProjectId,
                                query,
                                showAllTemplates
                              )
                            : "#"
                        }
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>

                    {/* First page */}
                    {currentPage > 2 && (
                      <PaginationItem>
                        <PaginationLink
                          href={createFormsPageHref(1, selectedProjectId, query, showAllTemplates)}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Ellipsis */}
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Previous page */}
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationLink
                          href={createFormsPageHref(
                            currentPage - 1,
                            selectedProjectId,
                            query,
                            showAllTemplates
                          )}
                        >
                          {currentPage - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Current page */}
                    <PaginationItem>
                      <PaginationLink
                        href={createFormsPageHref(
                          currentPage,
                          selectedProjectId,
                          query,
                          showAllTemplates
                        )}
                        isActive
                      >
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>

                    {/* Next page */}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink
                          href={createFormsPageHref(
                            currentPage + 1,
                            selectedProjectId,
                            query,
                            showAllTemplates
                          )}
                        >
                          {currentPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Ellipsis */}
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    {/* Last page */}
                    {currentPage < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationLink
                          href={createFormsPageHref(
                            totalPages,
                            selectedProjectId,
                            query,
                            showAllTemplates
                          )}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href={
                          currentPage < totalPages
                            ? createFormsPageHref(
                                currentPage + 1,
                                selectedProjectId,
                                query,
                                showAllTemplates
                              )
                            : "#"
                        }
                        aria-disabled={currentPage === totalPages}
                        className={
                          currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getCategoryLabel(category: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const labels: Record<string, string> = {
    CUSTOM: t("categories.custom"),
    MEETING: t("categories.meeting"),
    INSPECTION: t("categories.inspection"),
    INCIDENT: t("categories.incident"),
    RISK: t("categories.risk"),
    TRAINING: t("categories.training"),
    CHECKLIST: t("categories.checklist"),
    TIMESHEET: t("categories.timesheet"),
  };
  return labels[category] || category;
}

function getRoleLabel(role: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const roleLabels: Record<string, string> = {
    ADMIN: t("roles.admin"),
    HMS: "HMS",
    LEDER: t("roles.leader"),
    VERNEOMBUD: t("roles.safetyRep"),
    ANSATT: t("roles.employee"),
    BHT: "BHT",
    REVISOR: t("roles.auditor"),
  };
  return roleLabels[role] || role;
}

function getAccessLabel(
  accessType: string,
  allowedRoles: string | null,
  allowedUsers: string | null,
  t: Awaited<ReturnType<typeof getTranslations>>
) {
  if (accessType === "ALL") {
    return <span className="text-sm text-muted-foreground">{t("access.all")}</span>;
  }

  if (accessType === "ROLES" && allowedRoles) {
    try {
      const roles = JSON.parse(allowedRoles);
      if (roles.length === 0) return <span className="text-sm text-muted-foreground">{t("access.none")}</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {roles.slice(0, 2).map((role: string) => (
            <Badge key={role} variant="outline" className="text-xs">
              {getRoleLabel(role, t)}
            </Badge>
          ))}
          {roles.length > 2 && (
            <span className="text-xs text-muted-foreground">+{roles.length - 2}</span>
          )}
        </div>
      );
    } catch {
      return <span className="text-sm text-muted-foreground">-</span>;
    }
  }

  if (accessType === "USERS" && allowedUsers) {
    try {
      const users = JSON.parse(allowedUsers);
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {t("access.users", { count: users.length })}
          </Badge>
        </div>
      );
    } catch {
      return <span className="text-sm text-muted-foreground">-</span>;
    }
  }

  if (accessType === "ROLES_AND_USERS") {
    try {
      const roles = allowedRoles ? JSON.parse(allowedRoles) : [];
      const users = allowedUsers ? JSON.parse(allowedUsers) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {roles.slice(0, 1).map((role: string) => (
            <Badge key={role} variant="outline" className="text-xs">
              {getRoleLabel(role, t)}
            </Badge>
          ))}
          {roles.length > 1 && (
            <span className="text-xs text-muted-foreground">+{roles.length - 1}</span>
          )}
          {users.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {t("access.users", { count: users.length })}
            </Badge>
          )}
        </div>
      );
    } catch {
      return <span className="text-sm text-muted-foreground">-</span>;
    }
  }

  return <span className="text-sm text-muted-foreground">-</span>;
}

function createFormsPageHref(
  page: number,
  projectId: string | null,
  query: string,
  showAllTemplates: boolean
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (projectId) params.set("projectId", projectId);
  if (query) params.set("q", query);
  if (showAllTemplates) params.set("view", "all");
  return `/dashboard/forms?${params.toString()}`;
}

function buildFormDetailHref(
  formId: string,
  projectId: string | null,
  showAllTemplates: boolean
): string {
  const params = new URLSearchParams();
  if (projectId) {
    params.set("returnUrl", `/dashboard/projects/${projectId}`);
    params.set("projectId", projectId);
  }
  if (showAllTemplates) {
    params.set("allTemplates", "1");
  }
  const qs = params.toString();
  return qs ? `/dashboard/forms/${formId}?${qs}` : `/dashboard/forms/${formId}`;
}

function buildFormFillHref(
  formId: string,
  projectId: string | null,
  showAllTemplates: boolean
): string {
  const params = new URLSearchParams({
    returnUrl: projectId ? `/dashboard/projects/${projectId}` : "/dashboard/forms",
  });
  if (projectId) {
    params.set("projectId", projectId);
  }
  if (showAllTemplates) {
    params.set("allTemplates", "1");
  }
  return `/dashboard/forms/${formId}/fill?${params.toString()}`;
}

function buildFormExportHref(formId: string, showAllTemplates: boolean): string {
  if (!showAllTemplates) {
    return `/api/forms/${formId}/submissions/export`;
  }
  return `/api/forms/${formId}/submissions/export?allTemplates=1`;
}
