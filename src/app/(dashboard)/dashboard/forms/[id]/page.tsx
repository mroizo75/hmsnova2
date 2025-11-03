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
  FileText,
  Eye
} from "lucide-react";
import Link from "next/link";
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

const ITEMS_PER_PAGE = 20;

export default async function FormDetailPage({ 
  params,
  searchParams,
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const queryParams = await searchParams;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const currentPage = parseInt(queryParams.page || "1", 10);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const form = await prisma.formTemplate.findUnique({
    where: { id, tenantId: session.user.tenantId },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  if (!form) {
    redirect("/dashboard/forms");
  }

  // Hent submissions med paginering
  const submissions = await prisma.formSubmission.findMany({
    where: { formTemplateId: id },
    orderBy: { createdAt: "desc" },
    include: {
      fieldValues: true,
    },
    skip,
    take: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(form._count.submissions / ITEMS_PER_PAGE);

  // Hent alle submissions for statistikk
  const allSubmissions = await prisma.formSubmission.findMany({
    where: { formTemplateId: id },
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
  const completionRate = form._count.submissions > 0 ? Math.round((completedSubmissions / form._count.submissions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/forms">
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
          <Link href={`/dashboard/forms/${form.id}/fill`}>
            <Button variant="default" className="bg-green-600 hover:bg-green-700">
              <FileText className="h-4 w-4 mr-2" />
              Fyll ut skjema
            </Button>
          </Link>
          <Link href={`/dashboard/forms/${form.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Rediger
            </Button>
          </Link>
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
            <div className="text-2xl font-bold">{form._count.submissions}</div>
            <p className="text-xs text-muted-foreground mt-1">Utfyllinger totalt</p>
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
              {completedSubmissions} av {form._count.submissions}
            </p>
          </CardContent>
        </Card>
      </div>

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
              <CardTitle>Innsendte svar ({form._count.submissions})</CardTitle>
              {form._count.submissions > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Viser {skip + 1}-{Math.min(skip + ITEMS_PER_PAGE, form._count.submissions)} av {form._count.submissions}
                </p>
              )}
            </div>
            {form._count.submissions > 0 && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                <a href={`/api/forms/${form.id}/submissions/export`} download>
                  <Download className="h-4 w-4 mr-2" />
                  📊 Eksporter til Excel
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {form._count.submissions === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">Ingen utfyllinger ennå</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Antall felt utfylt</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
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
                          href={currentPage > 1 ? `/dashboard/forms/${id}?page=${currentPage - 1}` : "#"}
                          aria-disabled={currentPage === 1}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {currentPage > 2 && (
                        <PaginationItem>
                          <PaginationLink href={`/dashboard/forms/${id}?page=1`}>1</PaginationLink>
                        </PaginationItem>
                      )}

                      {currentPage > 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationLink href={`/dashboard/forms/${id}?page=${currentPage - 1}`}>
                            {currentPage - 1}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationLink href={`/dashboard/forms/${id}?page=${currentPage}`} isActive>
                          {currentPage}
                        </PaginationLink>
                      </PaginationItem>

                      {currentPage < totalPages && (
                        <PaginationItem>
                          <PaginationLink href={`/dashboard/forms/${id}?page=${currentPage + 1}`}>
                            {currentPage + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      {currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {currentPage < totalPages - 1 && (
                        <PaginationItem>
                          <PaginationLink href={`/dashboard/forms/${id}?page=${totalPages}`}>
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href={
                            currentPage < totalPages
                              ? `/dashboard/forms/${id}?page=${currentPage + 1}`
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
    CHECKBOX: "Avkrysning",
    RADIO: "Radioknapper",
    SELECT: "Rullegardin",
    FILE: "Fil",
    SIGNATURE: "Signatur",
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
