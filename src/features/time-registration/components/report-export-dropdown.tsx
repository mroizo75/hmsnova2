"use client";

import { useState } from "react";
import { format, getMonth, getWeek, getYear } from "date-fns";
import { nb } from "date-fns/locale";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReportPeriod = "day" | "week" | "month" | "year";

function localIsoDate(d = new Date()) {
  return format(d, "yyyy-MM-dd");
}

interface ReportExportDropdownProps {
  projects: { id: string; name: string; code: string | null }[];
  employees: { userId: string; name: string }[];
  canFilterEmployees: boolean;
  initialProjectId?: string;
}

export function ReportExportDropdown({
  projects,
  employees,
  canFilterEmployees,
  initialProjectId,
}: ReportExportDropdownProps) {
  const t = useTranslations("timesheet");
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [date, setDate] = useState(localIsoDate(now));
  const [year, setYear] = useState(String(getYear(now)));
  const [month, setMonth] = useState(String(getMonth(now) + 1));
  const [week, setWeek] = useState(
    String(getWeek(now, { weekStartsOn: 1, locale: nb }))
  );
  const [projectId, setProjectId] = useState(initialProjectId || "all");
  const [userId, setUserId] = useState("all");

  const buildUrl = (fileFormat: "excel" | "pdf") => {
    const params = new URLSearchParams({ format: fileFormat, period });
    if (period === "day") params.set("date", date);
    if (period === "week") {
      params.set("year", year);
      params.set("week", week);
    }
    if (period === "month") {
      params.set("year", year);
      params.set("month", month);
    }
    if (period === "year") params.set("year", year);
    if (projectId !== "all") params.set("projectId", projectId);
    if (canFilterEmployees && userId !== "all") params.set("userId", userId);
    return `/api/time-registration/report?${params.toString()}`;
  };

  const handleDownload = (fileFormat: "excel" | "pdf") => {
    const a = document.createElement("a");
    a.href = buildUrl(fileFormat);
    a.download = "";
    a.click();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t("reports.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("reports.title")}</DialogTitle>
          <DialogDescription>
            {canFilterEmployees
              ? t("reports.description")
              : t("reports.ownOnly")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="report-period">{t("reports.period")}</Label>
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as ReportPeriod)}
            >
              <SelectTrigger id="report-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t("reports.day")}</SelectItem>
                <SelectItem value="week">{t("reports.week")}</SelectItem>
                <SelectItem value="month">{t("reports.month")}</SelectItem>
                <SelectItem value="year">{t("reports.year")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "day" && (
            <div className="grid gap-2">
              <Label htmlFor="report-date">{t("date")}</Label>
              <Input
                id="report-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}

          {period === "week" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="report-week">{t("reports.week")}</Label>
                <Input
                  id="report-week"
                  type="number"
                  min={1}
                  max={53}
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="report-week-year">{t("reports.year")}</Label>
                <Input
                  id="report-week-year"
                  type="number"
                  min={2020}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            </div>
          )}

          {period === "month" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="report-month">{t("reports.month")}</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="report-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {format(new Date(2026, i, 1), "MMMM", { locale: nb })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="report-month-year">{t("reports.year")}</Label>
                <Input
                  id="report-month-year"
                  type="number"
                  min={2020}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            </div>
          )}

          {period === "year" && (
            <div className="grid gap-2">
              <Label htmlFor="report-year">{t("reports.year")}</Label>
              <Input
                id="report-year"
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="report-project">{t("project")}</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="report-project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reports.allProjects")}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.code} – ${p.name}` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canFilterEmployees && (
            <div className="grid gap-2">
              <Label htmlFor="report-employee">{t("employee")}</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="report-employee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allEmployees")}</SelectItem>
                  {employees.map((u) => (
                    <SelectItem key={u.userId} value={u.userId}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleDownload("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            {t("reports.pdf")}
          </Button>
          <Button onClick={() => handleDownload("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {t("reports.excel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
