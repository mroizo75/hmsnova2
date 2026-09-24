"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, AlertTriangle, XCircle, Clock, Download } from "lucide-react";
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
}

export function CompetenceMatrix({ matrix, courseTemplates, tenantId, reminderDays = 30 }: CompetenceMatrixProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Bruk courseTemplates fra databasen
  const courses = courseTemplates.map((template) => ({
    key: template.courseKey,
    title: template.title,
    isRequired: template.isRequired,
  }));

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      // Forbered data for PDF-generering
      const matrixData = matrix.map((item) => ({
        userName: item.user.name || item.user.email,
        courses: courses.map((course) => {
          const training = item.trainings.find((t) => t.courseKey === course.key);
          if (!training) {
            return {
              courseTitle: course.title,
              status: course.isRequired ? "MISSING_REQUIRED" : "NOT_TAKEN",
              isRequired: course.isRequired,
            };
          }
          const status = getTrainingStatus(training, reminderDays);
          return {
            courseTitle: course.title,
            status,
            completedAt: training.completedAt?.toISOString(),
            validUntil: training.validUntil?.toISOString(),
            isRequired: course.isRequired,
          };
        }),
      }));

      const response = await fetch("/api/training/competence-matrix/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matrixData,
          courseHeaders: courses.map((c) => c.title),
          tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke generere PDF");
      }

      // Last ned PDFen
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kompetansematrise-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF generert",
        description: "Kompetansematrisen er lastet ned",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke generere PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Fallback til jsPDF hvis Adobe ikke virker
  const handleExportPDFFallback = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.text("Kompetansematrise", 148, 12, { align: "center" });
      
      doc.setFontSize(9);
      doc.text(
        `Generert: ${new Date().toLocaleDateString("nb-NO")}`,
        148,
        18,
        { align: "center" }
      );

      const shortCourseTitles = courses.map((c) => {
        if (c.title.length > 20) {
          return c.title.substring(0, 17) + "...";
        }
        return c.title;
      });

      const tableHead = [["Ansatt", ...shortCourseTitles]];
      const tableBody = matrix.map((item) => {
        const row = [
          item.user.name || "Ukjent",
          ...courses.map((course) => {
            const training = item.trainings.find((t) => t.courseKey === course.key);
            if (!training) {
              return course.isRequired ? "✗" : "-";
            }
            const status = getTrainingStatus(training, reminderDays);
            let statusText = "-";
            if (status === "VALID" || status === "COMPLETED") {
              statusText = "✓";
            } else if (status === "EXPIRING_SOON") {
              statusText = "⚠";
            } else if (status === "EXPIRED") {
              statusText = "✗";
            }
            if (training.validUntil) {
              const date = new Date(training.validUntil).toLocaleDateString("nb-NO", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              });
              statusText += `\n${date}`;
            }
            return statusText;
          }),
        ];
        return row;
      });

      // Beregn kolonne-bredde dynamisk basert på antall kurs
      const pageWidth = doc.internal.pageSize.width - 20; // margins
      const nameColWidth = 35;
      const availableWidth = pageWidth - nameColWidth;
      const courseColWidth = Math.max(10, Math.min(20, availableWidth / courses.length));

      const columnStyles: any = { 0: { cellWidth: nameColWidth, fontStyle: "bold" } };
      for (let i = 1; i <= courses.length; i++) {
        columnStyles[i] = { cellWidth: courseColWidth, halign: "center" };
      }

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 23,
        theme: "grid",
        styles: {
          fontSize: courses.length > 8 ? 6 : 7,
          cellPadding: 1.5,
          overflow: "linebreak",
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
          fontSize: courses.length > 8 ? 6 : 7,
          cellPadding: 2,
        },
        columnStyles: columnStyles,
        margin: { left: 10, right: 10 },
        didParseCell: function (data) {
          if (data.section === "body" && data.column.index > 0) {
            const cellText = data.cell.text.join("");
            if (cellText.includes("✓")) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = "bold";
            } else if (cellText.includes("⚠")) {
              data.cell.styles.textColor = [202, 138, 4];
              data.cell.styles.fontStyle = "bold";
            } else if (cellText.includes("✗")) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });

      // Footer med forklaring
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(
        "Forklaring: ✓ = Gyldig kompetanse  |  ⚠ = Utløper snart  |  ✗ = Utløpt eller mangler  |  - = Ikke påkrevd",
        148,
        doc.internal.pageSize.height - 8,
        { align: "center" }
      );

      // Last ned
      doc.save(`kompetansematrise-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Kunne ikke generere PDF. Vennligst prøv igjen.");
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

  const getStatusBadge = (status: string) => {
    const label = getTrainingStatusLabel(status);
    let variant: "default" | "destructive" | "secondary" | "outline" = "default";

    switch (status) {
      case "VALID":
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800 border-green-300">{label}</Badge>;
      case "EXPIRING_SOON":
        return <Badge className="bg-yellow-100 text-black border-yellow-300">{label}</Badge>;
      case "EXPIRED":
        return <Badge variant="destructive">{label}</Badge>;
      case "NOT_STARTED":
        return <Badge variant="outline" className="text-gray-600">-</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
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
              Oversikt over hvilken kompetanse hver ansatt har. ISO 9001: Dokumentert kompetanse.
            </CardDescription>
          </div>
          <Button 
            onClick={handleExportPDF} 
            variant="outline" 
            className="print:hidden"
            disabled={isGeneratingPDF}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGeneratingPDF ? "Genererer PDF..." : "Eksporter til PDF"}
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
                          textAlign: "left"
                        }}
                      >
                        {course.title}
                        {course.isRequired && (
                          <span className="ml-1 text-red-600">*</span>
                        )}
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
                      (t) => t.courseKey === course.key
                    );

                    if (!training) {
                      return (
                        <td 
                          key={course.key} 
                          className="p-1 text-center border-l"
                          style={{ minWidth: "40px", maxWidth: "50px" }}
                        >
                          {course.isRequired ? (
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

        {/* Legend og info */}
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
              <span className="text-sm">Utløpt/Mangler</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Ikke startet</span>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            * = Påkrevd kompetanse | Hold musepekeren over en celle for mer informasjon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

