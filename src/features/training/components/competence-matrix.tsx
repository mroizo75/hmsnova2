"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, AlertTriangle, XCircle, Clock, FileSpreadsheet } from "lucide-react";
import {
  getTrainingStatus,
  getTrainingStatusLabel,
} from "@/features/training/schemas/training.schema";
import type { Training, CourseTemplate } from "@prisma/client";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CompetenceMatrixProps {
  matrix: Array<{
    user: { id: string; name: string | null; email: string };
    trainings: Training[];
  }>;
  courseTemplates: CourseTemplate[];
  tenantId: string;
  reminderDays?: number;
  requiredCourseKeysByUser?: Record<string, string[]>;
}

export function CompetenceMatrix({ matrix, courseTemplates, tenantId, reminderDays = 30, requiredCourseKeysByUser = {} }: CompetenceMatrixProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const courses = courseTemplates.map((template) => ({
    key: template.courseKey,
    title: template.title,
    isRequired: template.isRequired,
    validityYears: template.validityYears,
  }));

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "HMS Nova";
      workbook.created = new Date();

      const ws = workbook.addWorksheet("Kompetansematrise", {
        views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
      });

      // -- Tittelrad --
      const titleRow = ws.addRow(["Kompetansematrise"]);
      titleRow.font = { size: 16, bold: true };
      ws.mergeCells(1, 1, 1, 2 + courses.length);

      const dateRow = ws.addRow([`Generert: ${new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}`]);
      dateRow.font = { size: 10, color: { argb: "FF666666" } };
      ws.mergeCells(2, 1, 2, 2 + courses.length);

      // -- Kolonne-header --
      const headerValues = ["Ansatt", "E-post", ...courses.map((c) => c.title)];
      const headerRow = ws.addRow(headerValues);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true, textRotation: 45 };
      headerRow.height = 80;

      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF475569" } };
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = headerFill;
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNumber <= 2) {
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        }
      });

      // Kolonnebredder
      ws.getColumn(1).width = 25;
      ws.getColumn(2).width = 28;
      for (let i = 0; i < courses.length; i++) {
        ws.getColumn(3 + i).width = 14;
      }

      // -- Datarows --
      for (const item of matrix) {
        const row: (string | number)[] = [
          item.user.name || "Ukjent",
          item.user.email,
        ];

        for (const course of courses) {
          const training = item.trainings.find((t) => t.courseKey === course.key);
          if (!training) {
            const isRequired = (requiredCourseKeysByUser[item.user.id] ?? []).includes(course.key);
            row.push(isRequired ? "MANGLER" : "");
          } else {
            const status = getTrainingStatus(training, reminderDays);
            let cellText = "";
            if (status === "VALID" || status === "COMPLETED") {
              cellText = "OK";
            } else if (status === "EXPIRING_SOON") {
              cellText = "Utløper snart";
            } else if (status === "EXPIRED") {
              cellText = "Utløpt";
            } else {
              cellText = "Ikke dokumentert";
            }
            if (training.validUntil) {
              const d = new Date(training.validUntil).toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "numeric" });
              cellText += ` (${d})`;
            }
            row.push(cellText);
          }
        }

        const dataRow = ws.addRow(row);
        dataRow.font = { size: 10 };
        dataRow.getCell(1).font = { size: 10, bold: true };

        // Fargekod statusceller
        for (let i = 0; i < courses.length; i++) {
          const cell = dataRow.getCell(3 + i);
          const val = String(cell.value ?? "");
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };

          if (val.startsWith("OK")) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
            cell.font = { size: 10, color: { argb: "FF166534" }, bold: true };
          } else if (val.startsWith("Utløper snart")) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
            cell.font = { size: 10, color: { argb: "FF92400E" }, bold: true };
          } else if (val.startsWith("Utløpt") || val === "MANGLER") {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
            cell.font = { size: 10, color: { argb: "FF991B1B" }, bold: true };
          }
        }
      }

      // -- Oppsummeringsrad --
      ws.addRow([]);
      const summaryHeaderRow = ws.addRow(["Oppsummering", "", ...courses.map((c) => c.title)]);
      summaryHeaderRow.font = { bold: true, size: 10 };
      summaryHeaderRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

      const countRow = (label: string, statuses: string[]) => {
        const vals: (string | number)[] = [label, ""];
        for (const course of courses) {
          let count = 0;
          for (const item of matrix) {
            const training = item.trainings.find((t) => t.courseKey === course.key);
            if (!training) {
              if (statuses.includes("MISSING") && (requiredCourseKeysByUser[item.user.id] ?? []).includes(course.key)) {
                count++;
              }
              continue;
            }
            const status = getTrainingStatus(training, reminderDays);
            if (statuses.includes(status)) count++;
          }
          vals.push(count > 0 ? count : "");
        }
        return vals;
      };

      const okRow = ws.addRow(countRow("✓ Gyldig", ["VALID", "COMPLETED"]));
      okRow.font = { size: 9, color: { argb: "FF166534" } };
      okRow.getCell(1).font = { size: 9, color: { argb: "FF166534" }, bold: true };

      const warnRow = ws.addRow(countRow("⚠ Utløper snart", ["EXPIRING_SOON"]));
      warnRow.font = { size: 9, color: { argb: "FF92400E" } };
      warnRow.getCell(1).font = { size: 9, color: { argb: "FF92400E" }, bold: true };

      const expRow = ws.addRow(countRow("✗ Utløpt", ["EXPIRED"]));
      expRow.font = { size: 9, color: { argb: "FF991B1B" } };
      expRow.getCell(1).font = { size: 9, color: { argb: "FF991B1B" }, bold: true };

      const missingRow = ws.addRow(countRow("Mangler (påkrevd)", ["MISSING"]));
      missingRow.font = { size: 9, color: { argb: "FF991B1B" } };
      missingRow.getCell(1).font = { size: 9, color: { argb: "FF991B1B" }, bold: true };

      // -- Detaljark med fullstendig liste --
      const detailWs = workbook.addWorksheet("Kompetansedetaljer");
      const detailHeader = detailWs.addRow(["Ansatt", "E-post", "Kurs", "Status", "Gjennomført", "Gyldig til", "Leverandør", "Påkrevd"]);
      detailHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
      detailHeader.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
      });

      for (const item of matrix) {
        for (const course of courses) {
          const training = item.trainings.find((t) => t.courseKey === course.key);
          const isRequired = (requiredCourseKeysByUser[item.user.id] ?? []).includes(course.key);
          if (!training && !isRequired) continue;

          const status = training ? getTrainingStatusLabel(getTrainingStatus(training, reminderDays)) : "Mangler";
          const completedAt = training?.completedAt
            ? new Date(training.completedAt).toLocaleDateString("nb-NO")
            : "";
          const validUntil = training?.validUntil
            ? new Date(training.validUntil).toLocaleDateString("nb-NO")
            : "";

          detailWs.addRow([
            item.user.name || "Ukjent",
            item.user.email,
            course.title,
            status,
            completedAt,
            validUntil,
            training?.provider ?? "",
            isRequired ? "Ja" : "Nei",
          ]);
        }
      }

      detailWs.getColumn(1).width = 25;
      detailWs.getColumn(2).width = 28;
      detailWs.getColumn(3).width = 30;
      detailWs.getColumn(4).width = 18;
      detailWs.getColumn(5).width = 14;
      detailWs.getColumn(6).width = 14;
      detailWs.getColumn(7).width = 20;
      detailWs.getColumn(8).width = 10;

      // Last ned
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kompetansematrise-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Excel generert",
        description: "Kompetansematrisen er lastet ned som Excel-fil",
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke generere Excel-fil",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VALID":
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "EXPIRING_SOON":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "EXPIRED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "NOT_STARTED":
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (matrix.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Ingen ansatte funnet</h3>
          <p className="text-muted-foreground">
            Kompetansematrisen vil vises når ansatte har registrert opplæring.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Kompetansematrise
            </CardTitle>
            <CardDescription>
              Oversikt over all kompetanse — standard HMS-kurs og bedriftens egne kurs.
            </CardDescription>
          </div>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="print:hidden"
            disabled={isExporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting ? "Genererer..." : "Last ned Excel"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div
            className="overflow-auto max-h-[70vh] border rounded-lg"
            ref={tableRef}
          >
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="text-left p-2 font-semibold sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-b min-w-[150px]">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Ansatt</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {matrix.length} ansatte · {courses.length} kurs
                      </span>
                    </div>
                  </th>
                  {courses.map((course) => (
                    <th
                      key={course.key}
                      className="relative p-1 bg-slate-100 dark:bg-slate-800 border-b border-l"
                      style={{ minWidth: "40px", maxWidth: "50px", width: "50px" }}
                    >
                      <div className="flex items-start justify-center" style={{ height: "120px" }}>
                        <div
                          className="absolute bottom-2 left-1/2 origin-bottom-left text-xs font-semibold whitespace-nowrap"
                          style={{
                            transform: "rotate(-45deg) translateX(-50%)",
                            transformOrigin: "0 0",
                            width: "120px",
                            textAlign: "left",
                          }}
                        >
                          {course.title}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((item) => (
                  <tr key={item.user.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2 sticky left-0 bg-background z-10 border-r">
                      <div className="min-w-[130px]">
                        <div className="font-semibold text-sm">{item.user.name || "Ukjent"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.user.email}
                        </div>
                      </div>
                    </td>
                    {courses.map((course) => {
                      const training = item.trainings.find(
                        (t) => t.courseKey === course.key,
                      );

                      if (!training) {
                        return (
                          <td
                            key={course.key}
                            className="p-1 text-center border-l"
                            style={{ minWidth: "40px", maxWidth: "50px" }}
                          >
                            {(requiredCourseKeysByUser[item.user.id] ?? []).includes(course.key) ? (
                              <div className="flex flex-col items-center" title="Mangler påkrevd kompetanse">
                                <XCircle className="h-4 w-4 text-red-600" />
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                        );
                      }

                      const status = getTrainingStatus(training, reminderDays);
                      const validDate = training.validUntil
                        ? new Date(training.validUntil).toLocaleDateString("nb-NO", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })
                        : null;

                      return (
                        <td
                          key={course.key}
                          className="p-1 text-center border-l"
                          style={{ minWidth: "40px", maxWidth: "50px" }}
                          title={`${course.title}: ${getTrainingStatusLabel(status)}${validDate ? ` (${validDate})` : ""}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            {getStatusIcon(status)}
                            {validDate && (
                              <div className="text-[9px] text-muted-foreground leading-none">
                                {validDate}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-4 items-center justify-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm">Gyldig</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">Utløper snart</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm">Utløpt / Mangler</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">-</span>
              <span className="text-sm">Ikke relevant</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
