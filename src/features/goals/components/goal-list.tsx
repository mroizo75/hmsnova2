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
import { Progress } from "@/components/ui/progress";
import { Target, Trash2, Eye, Search, Filter, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { deleteGoal } from "@/server/actions/goal.actions";
import { useToast } from "@/hooks/use-toast";
import {
  getCategoryLabel,
  getCategoryColor,
  getStatusLabel,
  getStatusColor,
  calculateProgress,
  getProgressColor,
} from "@/features/goals/schemas/goal.schema";
import type { Goal } from "@prisma/client";

interface GoalListProps {
  goals: Goal[];
}

export function GoalList({ goals }: GoalListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Er du sikker på at du vil slette målet "${title}"?\n\nDette kan ikke angres.`)) {
      return;
    }

    setLoading(id);
    const result = await deleteGoal(id);
    if (result.success) {
      toast({
        title: "🗑️ Mål slettet",
        description: `"${title}" er permanent fjernet`,
      });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Sletting feilet",
        description: result.error || "Kunne ikke slette mål",
      });
    }
    setLoading(null);
  };

  // Filtering
  const filteredGoals = goals.filter((goal) => {
    const matchesSearch = goal.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter !== "all" && goal.status !== statusFilter) return false;
    if (categoryFilter !== "all" && goal.category !== categoryFilter) return false;
    return true;
  });

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <Target className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Ingen mål funnet</h3>
        <p className="mb-4 text-muted-foreground">
          Start med å opprette ditt første kvalitetsmål.
        </p>
        <Link href="/dashboard/goals/new">
          <Button>
            <Target className="mr-2 h-4 w-4" />
            Opprett mål
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
            placeholder="Søk etter mål..."
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
              <SelectItem value="ACTIVE">Aktivt</SelectItem>
              <SelectItem value="ACHIEVED">Oppnådd</SelectItem>
              <SelectItem value="AT_RISK">I risiko</SelectItem>
              <SelectItem value="FAILED">Ikke oppnådd</SelectItem>
              <SelectItem value="ARCHIVED">Arkivert</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle kategorier</SelectItem>
              <SelectItem value="QUALITY">Kvalitet</SelectItem>
              <SelectItem value="HMS">HMS</SelectItem>
              <SelectItem value="ENVIRONMENT">Miljø</SelectItem>
              <SelectItem value="CUSTOMER">Kunde</SelectItem>
              <SelectItem value="EFFICIENCY">Effektivitet</SelectItem>
              <SelectItem value="FINANCE">Økonomi</SelectItem>
              <SelectItem value="COMPETENCE">Kompetanse</SelectItem>
              <SelectItem value="OTHER">Annet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Viser {filteredGoals.length} av {goals.length} mål
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mål</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Fremgang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>År</TableHead>
              <TableHead className="text-right">Handlinger</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGoals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Ingen mål funnet
                </TableCell>
              </TableRow>
            ) : (
              filteredGoals.map((goal) => {
                const categoryLabel = getCategoryLabel(goal.category);
                const categoryColor = getCategoryColor(goal.category);
                const statusLabel = getStatusLabel(goal.status);
                const statusColor = getStatusColor(goal.status);
                const progress = calculateProgress(goal.currentValue, goal.targetValue, goal.baseline);
                const progressColor = getProgressColor(progress);

                return (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{goal.title}</div>
                        {goal.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {goal.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={categoryColor}>{categoryLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[150px]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{progress}%</span>
                          <span className="text-muted-foreground">
                            {goal.currentValue?.toFixed(1) || 0} / {goal.targetValue?.toFixed(1) || 0} {goal.unit || ""}
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      {goal.year}
                      {goal.quarter && ` Q${goal.quarter}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/goals/${goal.id}`}>
                        <Button variant="ghost" size="sm" className="mr-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(goal.id, goal.title)}
                        disabled={loading === goal.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

