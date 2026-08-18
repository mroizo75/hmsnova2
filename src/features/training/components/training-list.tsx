"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  Trash2,
  FileText,
  Search,
  Filter,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  List,
  ExternalLink,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { deleteTraining } from "@/server/actions/training.actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import {
  getTrainingStatus,
  getTrainingStatusLabel,
  getTrainingStatusColor,
} from "@/features/training/schemas/training.schema";
import { EditTrainingDialog } from "@/features/training/components/edit-training-dialog";
import type { Training } from "@prisma/client";

type SortField = "title" | "employee" | "completedAt" | "validUntil" | "status";
type SortDir = "asc" | "desc";
type ViewMode = "courses" | "employees";

interface TrainingListProps {
  trainings: (Training & { user?: { id: string; name: string | null; email: string } })[];
  tenantUsers?: Array<{ id: string; name: string | null; email: string }>;
  requiredCourseKeys?: string[];
}

export function TrainingList({ trainings, tenantUsers = [], requiredCourseKeys = [] }: TrainingListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [certLoading, setCertLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("validUntil");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("courses");
  const PAGE_SIZE = 15;

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette opplæringen "${title}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteTraining(id);
    if (result.success) {
      toast({
        title: "Kompetanse slettet",
        description: `"${title}" er permanent fjernet`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: result.error || "Kunne ikke slette opplæring",
      });
    }
    setLoading(null);
  };

  const handleViewCertificate = async (id: string) => {
    setCertLoading(id);
    try {
      const res = await fetch(`/api/training/${id}/certificate`);
      if (!res.ok) {
        toast({ variant: "destructive", title: "Feil", description: "Kunne ikke hente diplom" });
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke åpne diplom" });
    } finally {
      setCertLoading(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Filtering
  const filteredTrainings = useMemo(() => {
    return trainings.filter((training) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        training.title.toLowerCase().includes(q) ||
        training.provider.toLowerCase().includes(q) ||
        (training.user?.name?.toLowerCase().includes(q) || false) ||
        training.user?.email.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;
      return getTrainingStatus(training) === statusFilter;
    });
  }, [trainings, searchTerm, statusFilter]);

  // Sorting
  const sortedTrainings = useMemo(() => {
    const sorted = [...filteredTrainings];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title, "nb");
          break;
        case "employee":
          cmp = (a.user?.name || a.user?.email || "").localeCompare(
            b.user?.name || b.user?.email || "",
            "nb",
          );
          break;
        case "completedAt": {
          const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          cmp = aDate - bDate;
          break;
        }
        case "validUntil": {
          const aDate = a.validUntil ? new Date(a.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.validUntil ? new Date(b.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
          cmp = aDate - bDate;
          break;
        }
        case "status": {
          const order = { EXPIRED: 0, EXPIRING_SOON: 1, NOT_STARTED: 2, COMPLETED: 3, VALID: 4 };
          cmp = (order[getTrainingStatus(a)] ?? 5) - (order[getTrainingStatus(b)] ?? 5);
          break;
        }
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [filteredTrainings, sortField, sortDir]);

  // Ansatt-sentrert visning
  const employeeView = useMemo(() => {
    if (viewMode !== "employees") return [];
    const now = new Date();
    return tenantUsers
      .map((user) => {
        const userTrainings = trainings.filter((t) => t.userId === user.id);
        const validCourseKeys = new Set(
          userTrainings
            .filter((t) => t.completedAt)
            .filter((t) => !t.validUntil || new Date(t.validUntil) >= now)
            .map((t) => t.courseKey),
        );
        const missingRequired = requiredCourseKeys.filter((k) => !validCourseKeys.has(k));
        const expiringCount = userTrainings.filter((t) => {
          if (!t.validUntil) return false;
          const days = Math.ceil(
            (new Date(t.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return days > 0 && days <= 30;
        }).length;
        const expiredCount = userTrainings.filter((t) => {
          if (!t.validUntil) return false;
          return new Date(t.validUntil) < now;
        }).length;

        return {
          user,
          totalCourses: userTrainings.length,
          completedCourses: userTrainings.filter((t) => t.completedAt).length,
          missingRequired: missingRequired.length,
          expiringCount,
          expiredCount,
        };
      })
      .filter((e) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          e.user.name?.toLowerCase().includes(q) ||
          e.user.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aUrgent = a.expiredCount + a.missingRequired;
        const bUrgent = b.expiredCount + b.missingRequired;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent;
        return (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email, "nb");
      });
  }, [viewMode, tenantUsers, trainings, requiredCourseKeys, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(sortedTrainings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTrainings = sortedTrainings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const employeeTotalPages = Math.max(1, Math.ceil(employeeView.length / PAGE_SIZE));
  const employeeCurrentPage = Math.min(page, employeeTotalPages);
  const paginatedEmployees = employeeView.slice(
    (employeeCurrentPage - 1) * PAGE_SIZE,
    employeeCurrentPage * PAGE_SIZE,
  );

  if (trainings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Ingen kompetanse registrert</h3>
        <p className="mb-4 text-muted-foreground">
          Start med å registrere kompetanse for dine ansatte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View toggle + Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <Button
              variant={viewMode === "courses" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setViewMode("courses"); setPage(1); }}
              className="h-7 px-3 text-xs"
            >
              <List className="h-3 w-3 mr-1" />
              Per kurs
            </Button>
            <Button
              variant={viewMode === "employees" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setViewMode("employees"); setPage(1); }}
              className="h-7 px-3 text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              Per ansatt
            </Button>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={viewMode === "courses" ? "Søk kurs, leverandør, ansatt..." : "Søk ansatt..."}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
        </div>

        {viewMode === "courses" && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statuser</SelectItem>
                <SelectItem value="NOT_STARTED">Ikke dokumentert</SelectItem>
                <SelectItem value="COMPLETED">Fullført</SelectItem>
                <SelectItem value="VALID">Gyldig</SelectItem>
                <SelectItem value="EXPIRING_SOON">Utløper snart</SelectItem>
                <SelectItem value="EXPIRED">Utløpt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {viewMode === "courses" ? (
          <>
            Viser {Math.min((currentPage - 1) * PAGE_SIZE + 1, sortedTrainings.length)}–{Math.min(currentPage * PAGE_SIZE, sortedTrainings.length)} av {sortedTrainings.length} registreringer
            {sortedTrainings.length !== trainings.length && ` (filtrert fra ${trainings.length} totalt)`}
          </>
        ) : (
          <>
            {employeeView.length} ansatte
            {searchTerm && ` (filtrert fra ${tenantUsers.length} totalt)`}
          </>
        )}
      </div>

      {/* === KURS-VISNING === */}
      {viewMode === "courses" && (
        <>
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("title")} className="flex items-center font-medium hover:text-foreground transition-colors">
                      Kurs <SortIcon field="title" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("employee")} className="flex items-center font-medium hover:text-foreground transition-colors">
                      Ansatt <SortIcon field="employee" />
                    </button>
                  </TableHead>
                  <TableHead>Leverandør</TableHead>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("completedAt")} className="flex items-center font-medium hover:text-foreground transition-colors">
                      Gjennomført <SortIcon field="completedAt" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("validUntil")} className="flex items-center font-medium hover:text-foreground transition-colors">
                      Gyldig til <SortIcon field="validUntil" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("status")} className="flex items-center font-medium hover:text-foreground transition-colors">
                      Status <SortIcon field="status" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTrainings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Ingen registreringer funnet
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTrainings.map((training) => {
                    const status = getTrainingStatus(training);
                    const statusLabel = getTrainingStatusLabel(status);
                    const statusColor = getTrainingStatusColor(status);

                    return (
                      <TableRow key={training.id} className="group">
                        <TableCell>
                          <Link
                            href={`/dashboard/training/${training.id}`}
                            className="hover:underline"
                          >
                            <div className="font-medium flex items-center gap-2">
                              {training.title}
                              {training.isRequired && (
                                <Badge variant="outline" className="text-xs">
                                  Påkrevd
                                </Badge>
                              )}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </div>
                          </Link>
                          {training.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {training.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {training.user?.name || "Ukjent"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {training.user?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{training.provider}</TableCell>
                        <TableCell>
                          {training.completedAt
                            ? new Date(training.completedAt).toLocaleDateString("nb-NO")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {training.validUntil ? (
                            <div>
                              {new Date(training.validUntil).toLocaleDateString("nb-NO")}
                              {status === "EXPIRING_SOON" && (
                                <div className="text-xs text-yellow-600 font-medium mt-1">
                                  {Math.ceil(
                                    (new Date(training.validUntil).getTime() - new Date().getTime()) /
                                      (1000 * 60 * 60 * 24),
                                  )}{" "}
                                  dager igjen
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Utløper ikke</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColor}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!training.proofDocKey && (
                              <EditTrainingDialog
                                training={training}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Last opp diplom"
                                    className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                  >
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            )}
                            {training.proofDocKey && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Vis diplom"
                                onClick={() => handleViewCertificate(training.id)}
                                disabled={certLoading === training.id}
                              >
                                {certLoading === training.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                ) : (
                                  <FileText className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            )}
                            <EditTrainingDialog training={training} />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(training.id, training.title)}
                              disabled={loading === training.id}
                              title="Slett opplæring"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {paginatedTrainings.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Ingen registreringer funnet</p>
            ) : (
              paginatedTrainings.map((training) => {
                const status = getTrainingStatus(training);
                const statusLabel = getTrainingStatusLabel(status);
                const statusColor = getTrainingStatusColor(status);
                return (
                  <Card key={training.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link href={`/dashboard/training/${training.id}`} className="font-medium hover:underline">
                            {training.title}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {training.user?.name || "Ukjent"}
                            {training.provider ? ` · ${training.provider}` : ""}
                          </p>
                        </div>
                        <Badge className={statusColor}>{statusLabel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Gyldig til:{" "}
                        {training.validUntil
                          ? new Date(training.validUntil).toLocaleDateString("nb-NO")
                          : "Utløper ikke"}
                      </p>
                      <div className="flex gap-2 border-t pt-2">
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <Link href={`/dashboard/training/${training.id}`}>Åpne</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(training.id, training.title)}
                          disabled={loading === training.id}
                          aria-label="Slett opplæring"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* === ANSATT-VISNING === */}
      {viewMode === "employees" && (
        <>
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ansatt</TableHead>
                  <TableHead className="text-center">Registrerte kurs</TableHead>
                  <TableHead className="text-center">Mangler obligatorisk</TableHead>
                  <TableHead className="text-center">Utløper snart</TableHead>
                  <TableHead className="text-center">Utløpt</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Ingen ansatte funnet
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((emp) => {
                    const hasProblems = emp.expiredCount > 0 || emp.missingRequired > 0;
                    const hasWarnings = emp.expiringCount > 0;
                    return (
                      <TableRow key={emp.user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{emp.user.name || "Ukjent"}</div>
                            <div className="text-sm text-muted-foreground">{emp.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{emp.totalCourses}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.missingRequired > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {emp.missingRequired} mangler
                            </Badge>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.expiringCount > 0 ? (
                            <Badge className="bg-yellow-100 text-black border-yellow-300 text-xs">
                              {emp.expiringCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.expiredCount > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {emp.expiredCount}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasProblems ? (
                            <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                          ) : hasWarnings ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mx-auto" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {paginatedEmployees.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Ingen ansatte funnet</p>
            ) : (
              paginatedEmployees.map((emp) => {
                const hasProblems = emp.expiredCount > 0 || emp.missingRequired > 0;
                const hasWarnings = emp.expiringCount > 0;
                return (
                  <Card key={emp.user.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium">{emp.user.name || "Ukjent"}</h3>
                          <p className="text-sm text-muted-foreground">{emp.user.email}</p>
                        </div>
                        {hasProblems ? (
                          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                        ) : hasWarnings ? (
                          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span>{emp.totalCourses} kurs</span>
                        {emp.missingRequired > 0 ? (
                          <Badge variant="destructive" className="text-xs">{emp.missingRequired} mangler</Badge>
                        ) : null}
                        {emp.expiringCount > 0 ? (
                          <Badge className="border-yellow-300 bg-yellow-100 text-xs text-black">{emp.expiringCount} utløper</Badge>
                        ) : null}
                        {emp.expiredCount > 0 ? (
                          <Badge variant="destructive" className="text-xs">{emp.expiredCount} utløpt</Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <Pagination
            currentPage={employeeCurrentPage}
            totalPages={employeeTotalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Side {currentPage} av {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
          title="Første side"
        >
          «
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .reduce<(number | "...")[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((item, i) =>
            item === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
                …
              </span>
            ) : (
              <Button
                key={item}
                variant={currentPage === item ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(item as number)}
                className="h-8 w-8 p-0"
              >
                {item}
              </Button>
            ),
          )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
          title="Siste side"
        >
          »
        </Button>
      </div>
    </div>
  );
}
