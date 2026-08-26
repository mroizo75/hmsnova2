"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChemicalList } from "@/features/chemicals/components/chemical-list";
import { fetchChemicals } from "@/server/queries/chemical.queries";

type ChemicalsData = Awaited<ReturnType<typeof fetchChemicals>>;

interface ChemicalsContentProps {
  initialData: ChemicalsData;
  initialIsocyanateFilter?: "only" | "exclude";
  initialQuickFilter?: "missingSds" | "needsReview" | "overdue";
}

export function ChemicalsContent({ initialData, initialIsocyanateFilter, initialQuickFilter }: ChemicalsContentProps) {
  const t = useTranslations("dashboardChemicalsPage");

  const { data: chemicals } = useQuery({
    queryKey: ["chemicals"],
    queryFn: () => fetchChemicals(),
    initialData,
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const stats = {
    total: chemicals.length,
    active: chemicals.filter((c: any) => c.status === "ACTIVE").length,
    withIsocyanates: chemicals.filter((c: any) => c.containsIsocyanates).length,
    missingSDS: chemicals.filter((c: any) => !c.sdsKey).length,
    needsReview: chemicals.filter(
      (c: any) => c.nextReviewDate && new Date(c.nextReviewDate) <= thirtyDaysFromNow
    ).length,
    overdue: chemicals.filter(
      (c: any) => c.nextReviewDate && new Date(c.nextReviewDate) < now
    ).length,
  };

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.active.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{t("stats.active.description")}</p>
          </CardContent>
        </Card>

        <Link href="/dashboard/chemicals?isocyanates=1">
          <Card className="hover:bg-accent/50 transition-colors h-full cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.isocyanates.title")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.withIsocyanates}</div>
              <p className="text-xs text-muted-foreground">{t("stats.isocyanates.description")}</p>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/dashboard/chemicals?filter=missingSds"
          className={stats.missingSDS === 0 ? "pointer-events-none" : ""}
        >
          <Card
            className={`h-full transition-colors ${stats.missingSDS > 0 ? "hover:bg-accent/50 cursor-pointer" : ""}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.missingSds.title")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.missingSDS}</div>
              <p className="text-xs text-muted-foreground">{t("stats.missingSds.description")}</p>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/dashboard/chemicals?filter=needsReview"
          className={stats.needsReview === 0 ? "pointer-events-none" : ""}
        >
          <Card
            className={`h-full transition-colors ${stats.needsReview > 0 ? "hover:bg-accent/50 cursor-pointer" : ""}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.needsReview.title")}</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.needsReview}</div>
              <p className="text-xs text-muted-foreground">{t("stats.needsReview.description")}</p>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/dashboard/chemicals?filter=overdue"
          className={stats.overdue === 0 ? "pointer-events-none" : ""}
        >
          <Card
            className={`h-full transition-colors ${stats.overdue > 0 ? "hover:bg-accent/50 cursor-pointer" : ""}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("stats.overdue.title")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">{t("stats.overdue.description")}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Chemicals List */}
      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ChemicalList
            chemicals={chemicals}
            initialIsocyanateFilter={initialIsocyanateFilter}
            initialQuickFilter={initialQuickFilter}
          />
        </CardContent>
      </Card>
    </>
  );
}
