"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { GraduationCap, Trash2, FileText, Search, Filter, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { deleteTraining } from "@/server/actions/training.actions";
import { useToast } from "@/hooks/use-toast";
import {
  getTrainingStatus,
  getTrainingStatusLabel,
  getTrainingStatusColor,
} from "@/features/training/schemas/training.schema";
import { EditTrainingDialog } from "@/features/training/components/edit-training-dialog";
import type { Training } from "@prisma/client";

interface TrainingListProps {
  trainings: (Training & { user?: { name: string | null; email: string } })[];
}

export function TrainingList({ trainings }: TrainingListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [certLoading, setCertLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette opplæringen "${title}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteTraining(id);
    if (result.success) {
      toast({
        title: "🗑️ Opplæring slettet",
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

  // Filtering
  const filteredTrainings = trainings.filter((training) => {
    const matchesSearch =
      training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (training.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      training.user?.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;

    const status = getTrainingStatus(training);
    return status === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTrainings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTrainings = filteredTrainings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  if (trainings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Ingen opplæring registrert</h3>
        <p className="mb-4 text-muted-foreground">
          Start med å registrere kompetanse for dine ansatte.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk etter kurs, leverandør eller ansatt..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="NOT_STARTED">Ikke startet</SelectItem>
              <SelectItem value="COMPLETED">Fullført</SelectItem>
              <SelectItem value="VALID">Gyldig</SelectItem>
              <SelectItem value="EXPIRING_SOON">Utløper snart</SelectItem>
              <SelectItem value="EXPIRED">Utløpt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Viser {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredTrainings.length)}–{Math.min(currentPage * PAGE_SIZE, filteredTrainings.length)} av {filteredTrainings.length} opplæringer
        {filteredTrainings.length !== trainings.length && ` (filtrert fra ${trainings.length} totalt)`}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kurs</TableHead>
              <TableHead>Ansatt</TableHead>
              <TableHead>Leverandør</TableHead>
              <TableHead>Gjennomført</TableHead>
              <TableHead>Gyldig til</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrainings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Ingen opplæringer funnet
                </TableCell>
              </TableRow>
            ) : (
              paginatedTrainings.map((training) => {
                const status = getTrainingStatus(training);
                const statusLabel = getTrainingStatusLabel(status);
                const statusColor = getTrainingStatusColor(status);

                return (
                  <TableRow key={training.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {training.title}
                          {training.isRequired && (
                            <Badge variant="outline" className="text-xs">
                              Påkrevd
                            </Badge>
                          )}
                        </div>
                        {training.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {training.description}
                          </div>
                        )}
                      </div>
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
                                  (1000 * 60 * 60 * 24)
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

      {/* Paginering */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Side {currentPage} av {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
              title="Første side"
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
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
                    onClick={() => setPage(item as number)}
                    className="h-8 w-8 p-0"
                  >
                    {item}
                  </Button>
                )
              )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
              title="Siste side"
            >
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

