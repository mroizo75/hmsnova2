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
import { Trash2, Eye, Download, CheckCircle, Search, Filter, FileText } from "lucide-react";
import Link from "next/link";
import { deleteChemical, downloadSDS, verifyChemical } from "@/server/actions/chemical.actions";
import { useToast } from "@/hooks/use-toast";
import type { Chemical } from "@prisma/client";

interface ChemicalListProps {
  chemicals: Chemical[];
}

export function ChemicalList({ chemicals }: ChemicalListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const handleDownloadSDS = async (id: string, productName: string) => {
    setLoading(id);
    const result = await downloadSDS(id);
    if (result.success && result.data) {
      window.open(result.data.url, "_blank");
      toast({
        title: "📄 Datablad lastet ned",
        description: `Sikkerhetsdatablad for "${productName}"`,
        className: "bg-green-50 border-green-200",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Nedlasting feilet",
        description: result.error || "Kunne ikke laste ned datablad",
      });
    }
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
    return true;
  });

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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk etter produkt, leverandør eller CAS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Viser {filteredChemicals.length} av {chemicals.length} kjemikalier
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produkt</TableHead>
              <TableHead>Leverandør</TableHead>
              <TableHead>CAS-nummer</TableHead>
              <TableHead>Fareklasse</TableHead>
              <TableHead>Datablad</TableHead>
              <TableHead>Neste revisjon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredChemicals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Ingen kjemikalier funnet
                </TableCell>
              </TableRow>
            ) : (
              filteredChemicals.map((chemical) => (
                <TableRow key={chemical.id}>
                  <TableCell className="font-medium">{chemical.productName}</TableCell>
                  <TableCell>{chemical.supplier || "-"}</TableCell>
                  <TableCell>{chemical.casNumber || "-"}</TableCell>
                  <TableCell>{chemical.hazardClass || "-"}</TableCell>
                  <TableCell>
                    {chemical.sdsKey ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadSDS(chemical.id, chemical.productName)}
                        disabled={loading === chemical.id}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Last ned
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Mangler</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {chemical.nextReviewDate ? (
                      <div>
                        <div className={isOverdue(chemical.nextReviewDate) ? "text-red-600 font-medium" : ""}>
                          {new Date(chemical.nextReviewDate).toLocaleDateString("nb-NO")}
                        </div>
                        {isOverdue(chemical.nextReviewDate) && (
                          <div className="text-xs text-red-600">Forfalt!</div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(chemical.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/dashboard/chemicals/${chemical.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerify(chemical.id, chemical.productName)}
                      disabled={loading === chemical.id}
                      title="Verifiser i revisjon"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(chemical.id, chemical.productName)}
                      disabled={loading === chemical.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

