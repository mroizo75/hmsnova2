"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, UserCircle2, Folder, ChevronRight, Pencil, CheckCircle2, AlertTriangle, Search } from "lucide-react";
import {
  createRoutineFolder,
  deleteRoutineFolder,
  renameRoutineFolder,
} from "@/server/actions/routine.actions";
import { CorporateGroupLockBadge } from "@/components/corporate-group-lock-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale, useTranslations } from "next-intl";
import { fetchRoutines } from "@/server/queries/routine.queries";

type RoutinesData = NonNullable<Awaited<ReturnType<typeof fetchRoutines>>>;

type FolderRow = {
  id: string;
  name: string;
  _count: { routines: number };
};

interface RoutinesListContentProps {
  initialData: RoutinesData;
  folders: FolderRow[];
  activeFolderId: string | undefined;
  routinePerms: { canCreateRoutines: boolean; canManageRoutines: boolean } | null;
  query?: string;
  hasRegulatorySuggestions?: boolean;
}

export function RoutinesListContent({
  initialData,
  folders,
  activeFolderId,
  routinePerms,
  query,
  hasRegulatorySuggestions = false,
}: RoutinesListContentProps) {
  const t = useTranslations("dashboardRoutinesPage");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [folderName, setFolderName] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: allRoutines } = useQuery({
    queryKey: ["routines", query ?? ""],
    queryFn: () => fetchRoutines(query),
    initialData,
  });

  if (!allRoutines) return null;

  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  const routines = activeFolderId
    ? allRoutines.filter((r: { folderId?: string | null }) => r.folderId === activeFolderId)
    : allRoutines;

  async function refreshFolders() {
    await queryClient.invalidateQueries({ queryKey: ["routines"] });
    router.refresh();
  }

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
          </div>
          <form action="/dashboard/rutiner" className="flex flex-wrap items-center gap-2">
            {activeFolderId ? <input type="hidden" name="mappe" value={activeFolderId} /> : null}
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={query ?? ""}
                placeholder="Søk etter rutine eller prosedyre"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="outline" className="bg-transparent">
              Søk
            </Button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            <Link href={query ? `/dashboard/rutiner?q=${encodeURIComponent(query)}` : "/dashboard/rutiner"}>
              <Badge variant={!activeFolderId ? "default" : "outline"} className="cursor-pointer text-xs">
                Alle
              </Badge>
            </Link>
            {folders.map((folder) => (
              <Link
                key={folder.id}
                href={`/dashboard/rutiner?mappe=${folder.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              >
                <Badge
                  variant={activeFolderId === folder.id ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                >
                  <Folder className="mr-1 inline h-3 w-3" />
                  {folder.name}
                </Badge>
              </Link>
            ))}
          </div>
          {routinePerms?.canCreateRoutines && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Nytt mappenavn, f.eks. Verksted"
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setFolderError(null);
                  const result = await createRoutineFolder(folderName);
                  setBusy(false);
                  if (!result.success) {
                    setFolderError(result.error);
                    return;
                  }
                  setFolderName("");
                  await refreshFolders();
                }}
              >
                Ny mappe
              </Button>
              {activeFolder && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent"
                    disabled={busy}
                    onClick={async () => {
                      const next = window.prompt("Nytt mappenavn", activeFolder.name);
                      if (!next || next.trim() === activeFolder.name) return;
                      setBusy(true);
                      setFolderError(null);
                      const result = await renameRoutineFolder(activeFolder.id, next);
                      setBusy(false);
                      if (!result.success) {
                        setFolderError(result.error);
                        return;
                      }
                      await refreshFolders();
                    }}
                  >
                    Gi nytt navn
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent"
                    disabled={busy || activeFolder._count.routines > 0}
                    onClick={async () => {
                      setBusy(true);
                      setFolderError(null);
                      const result = await deleteRoutineFolder(activeFolder.id);
                      setBusy(false);
                      if (!result.success) {
                        setFolderError(result.error);
                        return;
                      }
                      router.push("/dashboard/rutiner");
                    }}
                  >
                    Slett tom mappe
                  </Button>
                </>
              )}
            </div>
          )}
          {folderError && <p className="text-sm text-destructive">{folderError}</p>}
        </CardHeader>
        <CardContent>
          {routines.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              {activeFolderId
                ? "Ingen rutiner eller prosedyrer i denne mappen."
                : hasRegulatorySuggestions
                  ? "Ingen rutiner er publisert ennå. Velg fra regelverket over og klikk «Publiser valgte rutiner»."
                  : t("list.empty")}
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
                        <Badge variant="outline" className="text-xs">
                          {routine.documentKind === "PROSEDYRE" ? "Prosedyre" : "Rutine"}
                        </Badge>
                        {routine.folder?.name && (
                          <span className="inline-flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {routine.folder.name}
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
