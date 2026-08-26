"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, BarChart3, Download, Eye, Pencil, PlayCircle, Plus } from "lucide-react";
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
import { fetchFormsList } from "@/server/queries/form.queries";

type FormsListData = NonNullable<Awaited<ReturnType<typeof fetchFormsList>>>;

interface FormsListContentProps {
  initialData: FormsListData;
  currentPage: number;
  selectedProjectId: string | null;
  query: string;
  showAllTemplates: boolean;
}

const ITEMS_PER_PAGE = 10;

export function FormsListContent({
  initialData,
  currentPage,
  selectedProjectId,
  query,
  showAllTemplates,
}: FormsListContentProps) {
  const { data } = useQuery({
    queryKey: ["forms"],
    queryFn: () => fetchFormsList({ page: currentPage, projectId: selectedProjectId, query, showAllTemplates }),
    initialData,
  });

  if (!data) return null;

  const { forms, totalForms, totalSubmissions, activeForms, permissions } = data;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;
  const totalPages = Math.ceil(totalForms / ITEMS_PER_PAGE);

  return (
    <>
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totalt antall skjemaer
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalForms}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeForms} aktive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totale utfyllinger
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">Alle innsendte svar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gjennomsnitt per skjema
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalForms > 0 ? Math.round(totalSubmissions / totalForms) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Utfyllinger per skjema</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>Tips:</strong> Bruk skjemabyggeren til å lage egne sjekklister, møtereferater og rapporter tilpasset din bedrift.
          </p>
          <p className="text-sm text-blue-900 mt-2">
            <strong>Eksempler:</strong> Vernerunde-sjekklister, HMS-morgenmøte, sikkerhetsobservasjoner, timelister og mer.
          </p>
        </CardContent>
      </Card>

      {totalForms === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ingen skjemaer ennå</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Kom i gang ved å opprette ditt første skjema med den visuelle skjemabyggeren.
            </p>
            <Link href="/dashboard/forms/new">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Opprett skjema
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dine skjemaer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Viser {skip + 1}–{Math.min(skip + ITEMS_PER_PAGE, totalForms)} av {totalForms}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skjemanavn</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tilgang</TableHead>
                  <TableHead className="text-right">Felt</TableHead>
                  <TableHead className="text-right">Utfyllinger</TableHead>
                  <TableHead>Sist brukt</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form: any) => (
                  <TableRow key={form.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{form.title}</p>
                          {form.isGlobal && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                              Eksempelmal
                            </Badge>
                          )}
                        </div>
                        {form.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{form.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{getCategoryLabel(form.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      {form.isActive ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aktiv</Badge>
                      ) : (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {getAccessLabel(form.accessType, form.allowedRoles, form.allowedUsers)}
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
                          {new Date(form.latestVisibleSubmissionCreatedAt).toLocaleDateString("nb-NO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Aldri</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={buildFormDetailHref(form.id, selectedProjectId, showAllTemplates)}>
                          <Button variant="ghost" size="sm" title="Se detaljer">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={buildFormFillHref(form.id, selectedProjectId, showAllTemplates)}>
                          <Button variant="ghost" size="sm" title="Fyll ut">
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                        {form.isGlobal ? (
                          <CopyFormButton formId={form.id} formTitle={form.title} />
                        ) : permissions.canManageForms && form.allowTenantDeletion ? (
                          <Link href={`/dashboard/forms/${form.id}/edit`}>
                            <Button variant="ghost" size="sm" title="Rediger">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                        ) : null}
                        {permissions.canManageForms && !form.isGlobal && form.allowTenantDeletion ? (
                          <DeleteFormButton
                            compact
                            formId={form.id}
                            formTitle={form.title}
                            submissionCount={form._count.submissions}
                            returnUrl={createFormsPageHref(currentPage, selectedProjectId, query, showAllTemplates)}
                          />
                        ) : null}
                        {form.visibleSubmissionCount > 0 && (
                          <Button variant="ghost" size="sm" title="Eksporter" asChild>
                            <a href={buildFormExportHref(form.id, showAllTemplates)} download>
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

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={currentPage > 1 ? createFormsPageHref(currentPage - 1, selectedProjectId, query, showAllTemplates) : "#"}
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {currentPage > 2 && (
                      <PaginationItem>
                        <PaginationLink href={createFormsPageHref(1, selectedProjectId, query, showAllTemplates)}>1</PaginationLink>
                      </PaginationItem>
                    )}
                    {currentPage > 3 && (
                      <PaginationItem><PaginationEllipsis /></PaginationItem>
                    )}
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationLink href={createFormsPageHref(currentPage - 1, selectedProjectId, query, showAllTemplates)}>
                          {currentPage - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink href={createFormsPageHref(currentPage, selectedProjectId, query, showAllTemplates)} isActive>
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink href={createFormsPageHref(currentPage + 1, selectedProjectId, query, showAllTemplates)}>
                          {currentPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    {currentPage < totalPages - 2 && (
                      <PaginationItem><PaginationEllipsis /></PaginationItem>
                    )}
                    {currentPage < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationLink href={createFormsPageHref(totalPages, selectedProjectId, query, showAllTemplates)}>
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href={currentPage < totalPages ? createFormsPageHref(currentPage + 1, selectedProjectId, query, showAllTemplates) : "#"}
                        aria-disabled={currentPage === totalPages}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
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
    BCM: "Beredskap",
    COMPLAINT: "Kundeklage",
  };
  return labels[category] || category;
}

function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    ADMIN: "Administrator",
    HMS: "HMS",
    LEDER: "Leder",
    VERNEOMBUD: "Verneombud",
    ANSATT: "Ansatt",
    BHT: "BHT",
    REVISOR: "Revisor",
  };
  return roleLabels[role] || role;
}

function getAccessLabel(accessType: string, allowedRoles: string | null, allowedUsers: string | null) {
  if (accessType === "ALL") {
    return <span className="text-sm text-muted-foreground">Alle</span>;
  }
  if (accessType === "ROLES" && allowedRoles) {
    try {
      const roles = JSON.parse(allowedRoles);
      if (roles.length === 0) return <span className="text-sm text-muted-foreground">Ingen</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {roles.slice(0, 2).map((role: string) => (
            <Badge key={role} variant="outline" className="text-xs">{getRoleLabel(role)}</Badge>
          ))}
          {roles.length > 2 && <span className="text-xs text-muted-foreground">+{roles.length - 2}</span>}
        </div>
      );
    } catch { return <span className="text-sm text-muted-foreground">-</span>; }
  }
  if (accessType === "USERS" && allowedUsers) {
    try {
      const users = JSON.parse(allowedUsers);
      return (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">{users.length} bruker{users.length !== 1 ? "e" : ""}</Badge>
        </div>
      );
    } catch { return <span className="text-sm text-muted-foreground">-</span>; }
  }
  if (accessType === "ROLES_AND_USERS") {
    try {
      const roles = allowedRoles ? JSON.parse(allowedRoles) : [];
      const users = allowedUsers ? JSON.parse(allowedUsers) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {roles.slice(0, 1).map((role: string) => (
            <Badge key={role} variant="outline" className="text-xs">{getRoleLabel(role)}</Badge>
          ))}
          {roles.length > 1 && <span className="text-xs text-muted-foreground">+{roles.length - 1}</span>}
          {users.length > 0 && (
            <Badge variant="outline" className="text-xs">{users.length} bruker{users.length !== 1 ? "e" : ""}</Badge>
          )}
        </div>
      );
    } catch { return <span className="text-sm text-muted-foreground">-</span>; }
  }
  return <span className="text-sm text-muted-foreground">-</span>;
}

function createFormsPageHref(page: number, projectId: string | null, query: string, showAllTemplates: boolean): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (projectId) params.set("projectId", projectId);
  if (query) params.set("q", query);
  if (showAllTemplates) params.set("view", "all");
  return `/dashboard/forms?${params.toString()}`;
}

function buildFormDetailHref(formId: string, projectId: string | null, showAllTemplates: boolean): string {
  const params = new URLSearchParams();
  if (projectId) {
    params.set("returnUrl", `/dashboard/projects/${projectId}`);
    params.set("projectId", projectId);
  }
  if (showAllTemplates) params.set("allTemplates", "1");
  const qs = params.toString();
  return qs ? `/dashboard/forms/${formId}?${qs}` : `/dashboard/forms/${formId}`;
}

function buildFormFillHref(formId: string, projectId: string | null, showAllTemplates: boolean): string {
  const params = new URLSearchParams({
    returnUrl: projectId ? `/dashboard/projects/${projectId}` : "/dashboard/forms",
  });
  if (projectId) params.set("projectId", projectId);
  if (showAllTemplates) params.set("allTemplates", "1");
  return `/dashboard/forms/${formId}/fill?${params.toString()}`;
}

function buildFormExportHref(formId: string, showAllTemplates: boolean): string {
  if (!showAllTemplates) return `/api/forms/${formId}/submissions/export`;
  return `/api/forms/${formId}/submissions/export?allTemplates=1`;
}
