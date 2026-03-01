"use client";

import { useEffect, useState } from "react";
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
import { Trash2, Eye, Download, Search, Filter, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { deleteChemical, verifyChemical } from "@/server/actions/chemical.actions";
import { useToast } from "@/hooks/use-toast";
import type { Chemical } from "@prisma/client";
import { normalizePpeFile } from "@/lib/pictograms";
import { IsocyanateBadge } from "@/components/isocyanate-warning";
import { ExposureRegisterBadge } from "@/components/exposure-register-warning";

interface ChemicalListProps {
  chemicals: Chemical[];
  initialIsocyanateFilter?: "only" | "exclude" | undefined;
  initialQuickFilter?: "missingSds" | "needsReview" | "overdue" | undefined;
}

export function ChemicalList({
  chemicals,
  initialIsocyanateFilter,
  initialQuickFilter,
}: ChemicalListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isocyanateFilter, setIsocyanateFilter] = useState<string>(
    initialIsocyanateFilter ?? "all"
  );
  const [revisionFilter, setRevisionFilter] = useState<string>(
    initialQuickFilter === "needsReview" ? "next30days" : initialQuickFilter === "overdue" ? "overdue" : "all"
  );
  const [missingSdsFilter, setMissingSdsFilter] = useState<string>(
    initialQuickFilter === "missingSds" ? "only" : "all"
  );
  const [sortOption, setSortOption] = useState<string>("revisionAsc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Last lagret filter/paginering fra localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("chemicalsTableState");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        searchTerm?: string;
        statusFilter?: string;
        isocyanateFilter?: string;
        missingSdsFilter?: string;
        revisionFilter?: string;
        sortOption?: string;
        page?: number;
      };
      if (typeof parsed.searchTerm === "string") {
        setSearchTerm(parsed.searchTerm);
      }
      if (typeof parsed.isocyanateFilter === "string" && !initialIsocyanateFilter) {
        setIsocyanateFilter(parsed.isocyanateFilter);
      } else if (initialIsocyanateFilter) {
        setIsocyanateFilter(initialIsocyanateFilter);
      }
      if (initialQuickFilter === "missingSds") {
        setMissingSdsFilter("only");
      } else if (typeof parsed.missingSdsFilter === "string") {
        setMissingSdsFilter(parsed.missingSdsFilter);
      }
      if (initialQuickFilter === "needsReview") {
        setRevisionFilter("next30days");
      } else if (initialQuickFilter === "overdue") {
        setRevisionFilter("overdue");
      } else if (typeof parsed.revisionFilter === "string") {
        setRevisionFilter(parsed.revisionFilter);
      }
      if (typeof parsed.sortOption === "string") {
        setSortOption(parsed.sortOption);
      }
      if (typeof parsed.page === "number" && parsed.page > 0) {
        setPage(parsed.page);
      }
    } catch {
      // Ignorer korrupte verdier
    }
  }, [initialIsocyanateFilter, initialQuickFilter]);

  // Lagre filter/paginering slik at det huskes ved navigering
  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = {
      searchTerm,
      statusFilter,
      isocyanateFilter,
      missingSdsFilter,
      revisionFilter,
      sortOption,
      page,
    };
    window.localStorage.setItem("chemicalsTableState", JSON.stringify(state));
  }, [searchTerm, statusFilter, isocyanateFilter, missingSdsFilter, revisionFilter, sortOption, page]);

  const handleDelete = async (id: string, productName: string) => {
    if (!confirm(`Er du sikker på at du vil slette "${productName}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteChemical(id);
    if (result.success) {
      toast({
        title: "🗑️ Kjemikalie slettet",
        description: `"${productName}" er permanent fjernet`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: result.error || "Kunne ikke slette kjemikalie",
      });
    }
    setLoading(null);
  };

  const handleDownloadSDS = (id: string, productName: string) => {
    setLoading(id);
    window.open(`/api/chemicals/${id}/download-sds`, "_blank");
    toast({
      title: "📄 Datablad lastet ned",
      description: `Sikkerhetsdatablad for "${productName}"`,
      className: "bg-green-50 border-green-200",
    });
    setLoading(null);
  };

  const handleVerify = async (id: string, productName: string) => {
    setLoading(id);
    const result = await verifyChemical(id);
    if (result.success) {
      toast({
        title: "✅ Kjemikalie verifisert",
        description: `"${productName}" er verifisert`,
        className: "bg-green-50 border-green-200",
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Verifisering feilet",
        description: result.error || "Kunne ikke verifisere",
      });
    }
    setLoading(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800 border-green-200">I bruk</Badge>;
      case "PHASED_OUT":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Utfases</Badge>;
      case "ARCHIVED":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Arkivert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = (nextReviewDate: Date | null) => {
    if (!nextReviewDate) return false;
    return new Date(nextReviewDate) < new Date();
  };

  // Filtering
  const filteredChemicals = chemicals.filter((chemical) => {
    const matchesSearch =
      chemical.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chemical.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chemical.casNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "all" && chemical.status !== statusFilter) return false;

    if (isocyanateFilter === "only" && !chemical.containsIsocyanates) return false;
    if (isocyanateFilter === "exclude" && chemical.containsIsocyanates) return false;

    if (missingSdsFilter === "only" && chemical.sdsKey) return false;

    if (revisionFilter !== "all") {
      const now = new Date();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const revDate = chemical.nextReviewDate
        ? new Date(chemical.nextReviewDate)
        : null;

      switch (revisionFilter) {
        case "hasDate":
          if (!revDate) return false;
          break;
        case "noDate":
          if (revDate) return false;
          break;
        case "overdue":
          if (!revDate || revDate >= now) return false;
          break;
        case "next30days":
          if (!revDate || revDate <= now || revDate > thirtyDaysFromNow) {
            return false;
          }
          break;
        default:
          break;
      }
    }

    return true;
  });

  // Sortering
  const sortedChemicals = [...filteredChemicals].sort((a, b) => {
    switch (sortOption) {
      case "productAsc":
        return a.productName.localeCompare(b.productName, "nb");
      case "productDesc":
        return b.productName.localeCompare(a.productName, "nb");
      case "supplierAsc": {
        const aSup = a.supplier || "";
        const bSup = b.supplier || "";
        return aSup.localeCompare(bSup, "nb");
      }
      case "supplierDesc": {
        const aSup = a.supplier || "";
        const bSup = b.supplier || "";
        return bSup.localeCompare(aSup, "nb");
      }
      case "revisionDesc":
      case "revisionAsc": {
        const aDate = a.nextReviewDate ? new Date(a.nextReviewDate).getTime() : null;
        const bDate = b.nextReviewDate ? new Date(b.nextReviewDate).getTime() : null;

        // Manglende dato legges sist
        if (aDate === null && bDate === null) return 0;
        if (aDate === null) return 1;
        if (bDate === null) return -1;

        if (sortOption === "revisionAsc") {
          return aDate - bDate;
        }
        return bDate - aDate;
      }
      default:
        return 0;
    }
  });

  const totalFiltered = sortedChemicals.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedChemicals = sortedChemicals.slice(
    startIndex,
    startIndex + pageSize
  );

  if (chemicals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Ingen kjemikalier funnet</h3>
        <p className="mb-4 text-muted-foreground">
          Start med å registrere ditt første produkt i stoffkartoteket.
        </p>
        <Link href="/dashboard/chemicals/new">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Registrer kjemikalie
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between w-full">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk etter produkt, leverandør eller CAS..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={isocyanateFilter}
            onValueChange={(value) => {
              setIsocyanateFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Isocyanater" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle stoffer</SelectItem>
              <SelectItem value="only">Kun diisocyanater</SelectItem>
              <SelectItem value="exclude">Ekskl. diisocyanater</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="ACTIVE">I bruk</SelectItem>
              <SelectItem value="PHASED_OUT">Utfases</SelectItem>
              <SelectItem value="ARCHIVED">Arkivert</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={missingSdsFilter}
            onValueChange={(value) => {
              setMissingSdsFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Datablad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="only">Mangler datablad</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={revisionFilter}
            onValueChange={(value) => {
              setRevisionFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Revisjon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle revisjoner</SelectItem>
              <SelectItem value="overdue">Forfalt</SelectItem>
              <SelectItem value="next30days">Neste 30 dager</SelectItem>
              <SelectItem value="hasDate">Har dato</SelectItem>
              <SelectItem value="noDate">Ingen dato</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOption}
            onValueChange={(value) => {
              setSortOption(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Sorter etter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revisionAsc">Revisjon (eldst først)</SelectItem>
              <SelectItem value="revisionDesc">Revisjon (nyest først)</SelectItem>
              <SelectItem value="productAsc">Produkt (A–Å)</SelectItem>
              <SelectItem value="productDesc">Produkt (Å–A)</SelectItem>
              <SelectItem value="supplierAsc">Leverandør (A–Å)</SelectItem>
              <SelectItem value="supplierDesc">Leverandør (Å–A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Viser {paginatedChemicals.length} av {totalFiltered} filtrerte kjemikalier
        {totalFiltered !== chemicals.length ? ` (totalt ${chemicals.length})` : ""} –{" "}
        {pageSize} per side
      </div>

      {/* Table – får plass uten horisontal scroll (table-fixed + truncate) */}
      <div className="w-full min-w-0 overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[16%] min-w-0 px-2">Produkt</TableHead>
              <TableHead className="hidden w-[11%] min-w-0 px-2 lg:table-cell">Leverandør</TableHead>
              <TableHead className="hidden w-[7%] min-w-0 px-2 xl:table-cell">CAS</TableHead>
              <TableHead className="hidden w-[12%] min-w-0 px-2 xl:table-cell">H-setninger</TableHead>
              <TableHead className="w-[9%] min-w-0 px-2">Fare</TableHead>
              <TableHead className="hidden w-[9%] min-w-0 px-2 lg:table-cell">PPE</TableHead>
              <TableHead className="hidden w-[5%] min-w-0 px-2 md:table-cell">SDS</TableHead>
              <TableHead className="hidden w-[8%] min-w-0 px-2 md:table-cell">Revisjon</TableHead>
              <TableHead className="w-[13%] min-w-0 px-2">Status</TableHead>
              <TableHead className="w-[10%] min-w-0 px-2 text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChemicals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Ingen kjemikalier funnet
                </TableCell>
              </TableRow>
            ) : (
              paginatedChemicals.map((chemical) => {
                const pictograms = chemical.warningPictograms
                  ? (() => { try { return JSON.parse(chemical.warningPictograms); } catch { return []; } })()
                  : [];
                const ppeList = chemical.requiredPPE
                  ? (() => { try { return JSON.parse(chemical.requiredPPE); } catch { return []; } })()
                  : [];

                return (
                <TableRow key={chemical.id}>
                  <TableCell className="font-medium min-w-0 px-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="truncate" title={chemical.productName}>{chemical.productName}</span>
                      <div className="flex flex-wrap gap-1">
                        {chemical.containsIsocyanates && <IsocyanateBadge />}
                        <ExposureRegisterBadge
                          hazardStatements={chemical.hazardStatements}
                          isCMR={chemical.isCMR}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell min-w-0 px-2">
                    <span className="truncate block" title={chemical.supplier || undefined}>{chemical.supplier || "-"}</span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell min-w-0 px-2 text-xs">
                    <span className="truncate block" title={chemical.casNumber || undefined}>{chemical.casNumber || "-"}</span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell min-w-0 px-2">
                    {chemical.hazardStatements ? (
                      <span className="text-sm text-orange-700 line-clamp-2 block truncate" title={chemical.hazardStatements}>
                        {chemical.hazardStatements}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-0 px-2">
                    {pictograms.length > 0 ? (
                      <>
                        <div className="lg:hidden">
                          <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-300 text-xs">
                            {pictograms.length} fare
                          </Badge>
                        </div>
                        <div className="hidden lg:flex gap-0.5 flex-wrap max-w-full">
                          {pictograms.slice(0, 3).map((file: string, idx: number) => (
                            <div key={idx} className="relative w-6 h-6 flex-shrink-0 border border-orange-200 rounded p-0.5">
                              <Image
                                src={`/faremerker/${file}`}
                                alt="Faresymbol"
                                width={24}
                                height={24}
                                className="object-contain"
                              />
                            </div>
                          ))}
                          {pictograms.length > 3 && (
                            <span className="text-xs text-muted-foreground self-center">+{pictograms.length - 3}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell min-w-0 px-2">
                    {ppeList.length > 0 ? (
                      <div className="flex gap-0.5 flex-wrap max-w-full">
                        {ppeList.slice(0, 3).map((file: string, idx: number) => {
                          const normalizedFile = normalizePpeFile(file);
                          if (!normalizedFile) return null;
                          return (
                            <div key={idx} className="relative w-6 h-6 flex-shrink-0 border border-blue-200 rounded p-0.5 bg-blue-50">
                              <Image
                                src={`/ppe/${normalizedFile}`}
                                alt="PPE"
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          );
                        })}
                        {ppeList.length > 3 && (
                          <span className="text-xs text-muted-foreground self-center">+{ppeList.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell min-w-0 px-2">
                    {chemical.sdsKey ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownloadSDS(chemical.id, chemical.productName)}
                        disabled={loading === chemical.id}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell min-w-0 px-2 text-xs whitespace-nowrap">
                    {chemical.nextReviewDate ? (
                      <div>
                        <div className={isOverdue(chemical.nextReviewDate) ? "text-red-600 font-medium" : ""}>
                          {new Date(chemical.nextReviewDate).toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </div>
                        {isOverdue(chemical.nextReviewDate) && (
                          <div className="text-xs text-red-600">Forfalt!</div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="min-w-0 px-2">
                    <div className="flex flex-wrap items-center gap-1 min-w-0">
                      {getStatusBadge(chemical.status)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right min-w-0 px-2">
                    <div className="flex items-center justify-end gap-0.5 flex-wrap">
                      <Link href={`/dashboard/chemicals/${chemical.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(chemical.id, chemical.productName)}
                        disabled={loading === chemical.id}
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
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <div>
            Side {currentPage} av {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Forrige
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Neste
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

