"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarClock, UserCircle2, Tag, ChevronRight, Pencil, CheckCircle2, AlertTriangle } from "lucide-react";
import { CorporateGroupLockBadge } from "@/components/corporate-group-lock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale, useTranslations } from "next-intl";
import { fetchRoutines } from "@/server/queries/routine.queries";

type RoutinesData = NonNullable<Awaited<ReturnType<typeof fetchRoutines>>>;

interface RoutinesListContentProps {
  initialData: RoutinesData;
  activeCategory: string | undefined;
  categoryLabelMap: Map<string, string>;
  routinePerms: { canCreateRoutines: boolean; canManageRoutines: boolean } | null;
  query?: string;
}

export function RoutinesListContent({
  initialData,
  activeCategory,
  categoryLabelMap,
  routinePerms,
  query,
}: RoutinesListContentProps) {
  const t = useTranslations("dashboardRoutinesPage");
  const locale = useLocale();

  const { data: allRoutines } = useQuery({
    queryKey: ["routines"],
    queryFn: () => fetchRoutines(query),
    initialData,
  });

  if (!allRoutines) return null;

  const routines = activeCategory
    ? allRoutines.filter((r: any) => r.category === activeCategory)
    : allRoutines;

  const usedCategories = [...new Set<string>(allRoutines.map((r: any) => r.category).filter(Boolean))];
  const sortedCategories = usedCategories.sort();

  const needsReviewCount = allRoutines.filter((r: any) => r.status === "NEEDS_REVIEW").length;
  const activeCount = allRoutines.filter((r: any) => r.status === "ACTIVE").length;

  function statusLabel(status: string): string {
    const labels: Record<string, string> = {
      ACTIVE: t("status.active"),
      DRAFT: t("status.draft"),
      NEEDS_REVIEW: t("status.needsReview"),
      ARCHIVED: t("status.archived"),
    };
    return labels[status] || status;
  }

  function statusVariant(status: string): "default" | "outline" | "secondary" | "destructive" {
    switch (status) {
      case "ACTIVE": return "default";
      case "NEEDS_REVIEW": return "destructive";
      case "DRAFT": return "secondary";
      default: return "outline";
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totalt</CardDescription>
            <CardTitle className="text-2xl">{routines.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">registrerte rutiner</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gjeldende</CardDescription>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">{activeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">aktive og oppdaterte</p>
          </CardContent>
        </Card>
        <Card className={needsReviewCount > 0 ? "border-amber-300 dark:border-amber-700" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Krever revisjon</CardDescription>
            <CardTitle className={`text-2xl ${needsReviewCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {needsReviewCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {needsReviewCount > 0 ? "bør gjennomgås snarest" : "ingen utestående"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t("list.title")}</CardTitle>
              <CardDescription>{t("list.description")}</CardDescription>
            </div>
            {sortedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Link href="/dashboard/rutiner">
                  <Badge
                    variant={!activeCategory ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                  >
                    Alle
                  </Badge>
                </Link>
                {sortedCategories.map((cat) => (
                  <Link key={cat} href={`/dashboard/rutiner?kategori=${cat}`}>
                    <Badge
                      variant={activeCategory === cat ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                    >
                      {categoryLabelMap.get(cat!) ?? cat}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {routines.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              {activeCategory ? "Ingen rutiner i denne kategorien." : t("list.empty")}
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map((routine: any) => {
                const isCustomized = routine.updatedBy != null;
                const isOverdue = routine.nextReviewAt && new Date(routine.nextReviewAt) < new Date();
                return (
                  <div
                    key={routine.id}
                    className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="shrink-0">
                      {routine.status === "NEEDS_REVIEW" || isOverdue ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : routine.status === "ACTIVE" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
                      )}
                    </div>

                    <Link href={`/dashboard/rutiner/${routine.id}`} className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {routine.title}
                        </span>
                        <Badge variant={statusVariant(routine.status)} className="text-xs">
                          {statusLabel(routine.status)}
                        </Badge>
                        {isCustomized && (
                          <Badge variant="secondary" className="text-xs">Tilpasset</Badge>
                        )}
                        <CorporateGroupLockBadge isLockedByGroup={(routine as any).isLockedByGroup ?? false} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        {routine.category && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {categoryLabelMap.get(routine.category) ?? routine.category}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <UserCircle2 className="h-3 w-3" />
                          {routine.responsibleUser?.name || routine.responsibleUser?.email || t("notSet")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {routine.nextReviewAt
                            ? new Date(routine.nextReviewAt).toLocaleDateString(locale === "en" ? "en-US" : "nb-NO")
                            : t("notSet")}
                        </span>
                      </div>
                    </Link>

                    <div className="flex shrink-0 items-center gap-1">
                      {routinePerms?.canCreateRoutines && !(routine as any).isLockedByGroup && (
                        <Link href={`/dashboard/rutiner/${routine.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Rediger rutine"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Rediger
                          </Button>
                        </Link>
                      )}
                      <Link href={`/dashboard/rutiner/${routine.id}`}>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
