"use client";

import { useState } from "react";
import { format, getWeek } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  updateTimeEntry,
  deleteTimeEntry,
  updateMileageEntry,
  deleteMileageEntry,
  getTimeRegistrationOverview,
} from "@/server/actions/time-registration.actions";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";
import { TimeEntryEditDialog } from "./time-entry-edit-dialog";
import { MileageEntryEditDialog } from "./mileage-entry-edit-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 15;
/** Trekkfri sats pr km (Skatteetaten 2024–2026). Beløp over dette er skattepliktig. */
const TREKKFRI_KM_SATS = 3.5;

const TIME_TYPE_LABELS: Record<string, string> = {
  NORMAL: "Ordinær",
  OVERTIME_50: "Overtid 50 %",
  OVERTIME_40: "Overtid 40 %",
  OVERTIME_100: "Overtid 100 %",
  WEEKEND: "Helg/helligdag",
  TRAVEL: "Reise/kjøring",
  SICK_LEAVE: "Sykefravær",
};

type OverviewData = NonNullable<
  Awaited<ReturnType<typeof getTimeRegistrationOverview>>["data"]
>;

interface TimeRegistrationOverviewProps {
  initialData: OverviewData;
  tenantId: string;
  isAdmin: boolean;
  initialProjectFilter?: string;
  /** Når satt, viser kun denne brukerens registreringer (for ansatt) */
  restrictToUserId?: string;
}

export function TimeRegistrationOverview({
  initialData,
  tenantId,
  isAdmin,
  initialProjectFilter,
  restrictToUserId,
}: TimeRegistrationOverviewProps) {
  const { toast } = useToast();
  const [data, setData] = useState(initialData);
  const now = new Date();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [week] = useState(() =>
    getWeek(new Date(), { weekStartsOn: 1, locale: nb })
  );
  const ALL_FILTER = "__all__" as const;
  const hasInitialProject = Boolean(
    initialProjectFilter && initialData.projects.some((project) => project.id === initialProjectFilter)
  );
  const [projectFilter, setProjectFilter] = useState<string>(
    hasInitialProject && initialProjectFilter ? initialProjectFilter : ALL_FILTER
  );
  const [userFilter, setUserFilter] = useState<string>(ALL_FILTER);
  const [deleteId, setDeleteId] = useState<{
    type: "time" | "mileage";
    id: string;
  } | null>(null);
  const [editTimeEntry, setEditTimeEntry] = useState<
    OverviewData["timeEntries"][number] | null
  >(null);
  const [editMileageEntry, setEditMileageEntry] = useState<
    OverviewData["mileageEntries"][number] | null
  >(null);
  const [timePage, setTimePage] = useState(1);
  const [mileagePage, setMileagePage] = useState(1);

  const refresh = async () => {
    const nowRef = new Date();
    const effectivePeriod = restrictToUserId ? "month" as const : period;
    const effectiveYear = restrictToUserId ? nowRef.getFullYear() : year;
    const effectiveMonth = restrictToUserId ? nowRef.getMonth() + 1 : month;
    const res = await getTimeRegistrationOverview(tenantId, {
      period: effectivePeriod,
      year: effectiveYear,
      month: effectiveMonth,
      week,
      projectId: projectFilter === ALL_FILTER ? undefined : projectFilter,
      userId: restrictToUserId ?? (userFilter === ALL_FILTER ? undefined : userFilter),
    });
    if (res.success && res.data) {
      setData(res.data);
      setTimePage(1);
      setMileagePage(1);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res =
      deleteId.type === "time"
        ? await deleteTimeEntry(deleteId.id)
        : await deleteMileageEntry(deleteId.id);
    if (!res.success) {
      toast({ variant: "destructive", title: res.error });
      return;
    }
    toast({ title: "Slettet" });
    setDeleteId(null);
    refresh();
  };

  const normalHours = data.timeEntries
    .filter((e) => e.timeType === "NORMAL" || e.timeType === "TRAVEL")
    .reduce((s, e) => s + e.hours, 0);
  const overtime40Hours = data.timeEntries
    .filter((e) => e.timeType === "OVERTIME_40")
    .reduce((s, e) => s + e.hours, 0);
  const overtime50Hours = data.timeEntries
    .filter((e) => e.timeType === "OVERTIME_50")
    .reduce((s, e) => s + e.hours, 0);
  const overtime100Hours = data.timeEntries
    .filter((e) => e.timeType === "OVERTIME_100" || e.timeType === "WEEKEND")
    .reduce((s, e) => s + e.hours, 0);
  const overtimeHours = overtime40Hours + overtime50Hours + overtime100Hours;
  const sickHours = data.timeEntries
    .filter((e) => e.timeType === "SICK_LEAVE")
    .reduce((s, e) => s + e.hours, 0);
  const totalKm = data.mileageEntries.reduce((s, e) => s + e.kilometers, 0);
  const defaultKmRate = data.config?.defaultKmRate ?? 4.5;
  const totalAmount = data.mileageEntries.reduce(
    (s, e) => s + (e.amount ?? e.kilometers * (e.ratePerKm ?? defaultKmRate)),
    0
  );
  const skattepliktigKmAmount = data.mileageEntries.reduce(
    (s, e) => {
      const rate = e.ratePerKm ?? defaultKmRate;
      const skattPerKm = Math.max(0, rate - TREKKFRI_KM_SATS);
      return s + e.kilometers * skattPerKm;
    },
    0
  );

  const cfg = data.config;
  const hourlyRate = cfg?.defaultHourlyRate ?? null;
  const taxPercent = cfg?.approximateTaxPercent ?? 25;
  const kmAllowanceTaxable = cfg?.kmAllowanceTaxable ?? false;
  const mult40 = cfg?.overtime40Multiplier ?? 1.4;
  const mult50 = cfg?.overtime50Multiplier ?? 1.5;
  const mult100 = cfg?.overtime100Multiplier ?? 2;
  const grossFromHours =
    hourlyRate != null && hourlyRate > 0
      ? normalHours * hourlyRate +
        sickHours * hourlyRate +
        overtime40Hours * hourlyRate * mult40 +
        overtime50Hours * hourlyRate * mult50 +
        overtime100Hours * hourlyRate * mult100
      : null;
  const grossTaxable =
    grossFromHours != null && restrictToUserId && kmAllowanceTaxable
      ? grossFromHours + skattepliktigKmAmount
      : grossFromHours;
  const taxAmount =
    grossTaxable != null ? grossTaxable * (taxPercent / 100) : null;
  const netPay =
    grossFromHours != null &&
    taxAmount != null &&
    restrictToUserId
      ? grossFromHours + totalAmount - taxAmount
      : null;

  const displayName = (userId: string) =>
    data.userDisplayNames[userId] || userId;

  const timeTotalPages = Math.max(1, Math.ceil(data.timeEntries.length / PAGE_SIZE));
  const mileageTotalPages = Math.max(1, Math.ceil(data.mileageEntries.length / PAGE_SIZE));
  const paginatedTimeEntries = data.timeEntries.slice(
    (timePage - 1) * PAGE_SIZE,
    timePage * PAGE_SIZE
  );
  const paginatedMileageEntries = data.mileageEntries.slice(
    (mileagePage - 1) * PAGE_SIZE,
    mileagePage * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      {restrictToUserId && (
        <p className="text-sm text-muted-foreground">
          Gjeldende måned – oversikt for lønn
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {!restrictToUserId && (
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Uke</SelectItem>
            <SelectItem value="month">Måned</SelectItem>
            <SelectItem value="year">År</SelectItem>
          </SelectContent>
        </Select>
        )}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alle prosjekter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>Alle prosjekter</SelectItem>
            {data.projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Alle ansatte" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value={ALL_FILTER}>Alle ansatte</SelectItem>
            {data.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant="ghost" size="sm" onClick={refresh}>
          Oppdater
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
        <div className="rounded-lg border p-3">
          <span className="text-muted-foreground">Ordinære timer</span>
          <p className="text-xl font-bold">{normalHours.toFixed(1)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <span className="text-muted-foreground">Overtidstimer</span>
          <p className="text-xl font-bold">{overtimeHours.toFixed(1)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <span className="text-muted-foreground">Sykefravær</span>
          <p className="text-xl font-bold">{sickHours.toFixed(1)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <span className="text-muted-foreground">Totalt km</span>
          <p className="text-xl font-bold">{totalKm.toFixed(0)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <span className="text-muted-foreground">Km godtgjørelse</span>
          <p className="text-xl font-bold">{totalAmount.toFixed(0)} kr</p>
        </div>
      </div>
      {restrictToUserId && netPay != null && grossFromHours != null && (
        <div className="rounded-lg border p-4 bg-muted/50">
          <p className="text-sm font-medium mb-2">Ca. utbetaling (estimat)</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              Brutto timer: <strong>{Math.round(grossFromHours).toLocaleString("nb-NO")} kr</strong>
            </span>
            {totalAmount > 0 && (
              <span>
                Km godtgjørelse: <strong>{Math.round(totalAmount).toLocaleString("nb-NO")} kr</strong>
                {kmAllowanceTaxable && skattepliktigKmAmount > 0 ? (
                  <span className="text-muted-foreground">
                    {" "}({Math.round(skattepliktigKmAmount).toLocaleString("nb-NO")} kr skattepliktig)
                  </span>
                ) : (
                  <span className="text-muted-foreground"> (utenom skatt)</span>
                )}
              </span>
            )}
            <span>
              Ca. skatt ({taxPercent}%): <strong>{Math.round(taxAmount ?? 0).toLocaleString("nb-NO")} kr</strong>
            </span>
            <span>
              Ca. utbetaling: <strong className="text-green-700 dark:text-green-400">{Math.round(netPay).toLocaleString("nb-NO")} kr</strong>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {kmAllowanceTaxable
              ? `Første ${TREKKFRI_KM_SATS} kr/km trekkfri. Overskudd over det skattes. `
              : "Km godtgjørelse utenom brutto – ikke med i skattegrunnlag. "}
            Faktisk lønn beregnes av lønnssystem.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2">Timer</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Dato</TableHead>
                  <TableHead>Prosjekt</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Timer</TableHead>
                  <TableHead>Kommentar</TableHead>
                  {isAdmin && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTimeEntries.map((e) => (
                  <TableRow key={`t-${e.id}`}>
                    <TableCell className="font-medium">
                      {displayName(e.user.id)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(e.date), "dd.MM.yy", { locale: nb })}
                    </TableCell>
                    <TableCell>
                      {e.project.code ? `${e.project.code} – ` : ""}
                      {e.project.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TIME_TYPE_LABELS[e.timeType] || e.timeType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(e.hours).toFixed(1)} t
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {e.comment || "–"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditTimeEntry(e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteId({ type: "time", id: e.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {data.timeEntries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Ingen timeregistreringer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {timeTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>
                  Viser {(timePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(timePage * PAGE_SIZE, data.timeEntries.length)} av{" "}
                  {data.timeEntries.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={timePage <= 1}
                    onClick={() => setTimePage((p) => Math.max(1, p - 1))}
                  >
                    Forrige
                  </Button>
                  <span className="text-xs">
                    Side {timePage} av {timeTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={timePage >= timeTotalPages}
                    onClick={() =>
                      setTimePage((p) => Math.min(timeTotalPages, p + 1))
                    }
                  >
                    Neste
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Km godtgjørelse</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navn</TableHead>
                  <TableHead>Dato</TableHead>
                  <TableHead>Prosjekt</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">Beløp</TableHead>
                  <TableHead>Kommentar</TableHead>
                  {isAdmin && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMileageEntries.map((e) => (
                  <TableRow key={`m-${e.id}`}>
                    <TableCell className="font-medium">
                      {displayName(e.user.id)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(e.date), "dd.MM.yy", { locale: nb })}
                    </TableCell>
                    <TableCell>
                      {e.project.code ? `${e.project.code} – ` : ""}
                      {e.project.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(Number(e.kilometers))} km
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(
                        e.amount ?? e.kilometers * (e.ratePerKm ?? defaultKmRate)
                      )}{" "}
                      kr
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {e.comment || "–"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditMileageEntry(e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setDeleteId({ type: "mileage", id: e.id })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {data.mileageEntries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 7 : 6}
                      className="text-center py-6 text-muted-foreground"
                    >
                      Ingen km-registreringer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {mileageTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>
                  Viser {(mileagePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(mileagePage * PAGE_SIZE, data.mileageEntries.length)}{" "}
                  av {data.mileageEntries.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={mileagePage <= 1}
                    onClick={() => setMileagePage((p) => Math.max(1, p - 1))}
                  >
                    Forrige
                  </Button>
                  <span className="text-xs">
                    Side {mileagePage} av {mileageTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={mileagePage >= mileageTotalPages}
                    onClick={() =>
                      setMileagePage((p) =>
                        Math.min(mileageTotalPages, p + 1)
                      )
                    }
                  >
                    Neste
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {editTimeEntry && (
        <TimeEntryEditDialog
          open={!!editTimeEntry}
          onOpenChange={(o) => !o && setEditTimeEntry(null)}
          entry={editTimeEntry}
          onSuccess={() => {
            setEditTimeEntry(null);
            refresh();
          }}
        />
      )}
      {editMileageEntry && (
        <MileageEntryEditDialog
          open={!!editMileageEntry}
          onOpenChange={(o) => !o && setEditMileageEntry(null)}
          entry={editMileageEntry}
          onSuccess={() => {
            setEditMileageEntry(null);
            refresh();
          }}
        />
      )}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slette registrering?</AlertDialogTitle>
            <AlertDialogDescription>
              Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
