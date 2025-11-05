import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, TrendingUp, BarChart3, Download, Eye, Pencil } from "lucide-react";
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

const ITEMS_PER_PAGE = 10;

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const currentPage = parseInt(params.page || "1", 10);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Hent totalt antall skjemaer
  const totalForms = await prisma.formTemplate.count({
    where: { tenantId: session.user.tenantId },
  });

  const totalPages = Math.ceil(totalForms / ITEMS_PER_PAGE);

  // Hent skjemaer for current page
  const forms = await prisma.formTemplate.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      _count: {
        select: {
          fields: true,
          submissions: true,
        },
      },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: ITEMS_PER_PAGE,
  });

  // Beregn stats (alle skjemaer)
  const allForms = await prisma.formTemplate.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  const totalSubmissions = allForms.reduce((sum, form) => sum + form._count.submissions, 0);
  const activeForms = allForms.filter((f) => f.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Digitale skjemaer</h1>
          <p className="text-muted-foreground mt-1">
            Lag, administrer og analyser egendefinerte skjemaer
          </p>
        </div>
        <Link href="/dashboard/forms/new">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Nytt skjema
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
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
            <p className="text-xs text-muted-foreground mt-1">
              {activeForms} aktive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totalt antall utfyllinger
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Alle skjemaer
            </p>
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
            <p className="text-xs text-muted-foreground mt-1">
              Utfyllinger
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info box */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Tips:</strong> Klikk på et skjema for å se alle utfyllinger, statistikk og laste ned PDF-er. 
            Bruk målinger for å følge med på hvor ofte skjemaene brukes!
          </p>
        </CardContent>
      </Card>

      {/* Forms table */}
      {totalForms === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ingen skjemaer ennå</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Opprett ditt første digitale skjema med vår drag-and-drop builder
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
              <CardTitle>Alle skjemaer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Viser {skip + 1}-{Math.min(skip + ITEMS_PER_PAGE, totalForms)} av {totalForms}
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
                {forms.map((form) => (
                  <TableRow key={form.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{form.title}</p>
                        {form.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(form.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {form.isActive ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Aktiv
                        </Badge>
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
                        <span className="font-medium">{form._count.submissions}</span>
                        {form._count.submissions > 0 && (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {form.submissions.length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(form.submissions[0].createdAt).toLocaleDateString("nb-NO", {
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
                        <Link href={`/dashboard/forms/${form.id}`}>
                          <Button variant="ghost" size="sm" title="Se detaljer og statistikk">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/forms/${form.id}/edit`}>
                          <Button variant="ghost" size="sm" title="Rediger skjema">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        {form._count.submissions > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Eksporter alle svar til Excel"
                            asChild
                          >
                            <a href={`/api/forms/${form.id}/submissions/export`} download>
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
                        href={currentPage > 1 ? `/dashboard/forms?page=${currentPage - 1}` : "#"}
                        aria-disabled={currentPage === 1}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>

                    {/* First page */}
                    {currentPage > 2 && (
                      <PaginationItem>
                        <PaginationLink href="/dashboard/forms?page=1">1</PaginationLink>
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
                        <PaginationLink href={`/dashboard/forms?page=${currentPage - 1}`}>
                          {currentPage - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    {/* Current page */}
                    <PaginationItem>
                      <PaginationLink href={`/dashboard/forms?page=${currentPage}`} isActive>
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>

                    {/* Next page */}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink href={`/dashboard/forms?page=${currentPage + 1}`}>
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
                        <PaginationLink href={`/dashboard/forms?page=${totalPages}`}>
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        href={
                          currentPage < totalPages
                            ? `/dashboard/forms?page=${currentPage + 1}`
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

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  HMS: "HMS",
  LEDER: "Leder",
  VERNEOMBUD: "Verneombud",
  ANSATT: "Ansatt",
  BHT: "BHT",
  REVISOR: "Revisor",
};

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
            <Badge key={role} variant="outline" className="text-xs">
              {roleLabels[role] || role}
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
            {users.length} bruker{users.length !== 1 ? "e" : ""}
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
              {roleLabels[role] || role}
            </Badge>
          ))}
          {roles.length > 1 && (
            <span className="text-xs text-muted-foreground">+{roles.length - 1}</span>
          )}
          {users.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {users.length} bruker{users.length !== 1 ? "e" : ""}
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
