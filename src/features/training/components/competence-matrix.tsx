"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, AlertTriangle, XCircle, Clock, Download } from "lucide-react";
import {
  getTrainingStatus,
  getTrainingStatusLabel,
  STANDARD_COURSES,
} from "@/features/training/schemas/training.schema";
import type { Training } from "@prisma/client";
import { useRef } from "react";

interface CompetenceMatrixProps {
  matrix: Array<{
    user: { id: string; name: string | null; email: string };
    trainings: Training[];
  }>;
}

export function CompetenceMatrix({ matrix }: CompetenceMatrixProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  // Get all unique course keys from trainings
  const allCourseKeys = Array.from(
    new Set(matrix.flatMap((m) => m.trainings.map((t) => t.courseKey)))
  );

  // Merge with standard courses
  const courses = STANDARD_COURSES.map((c) => ({
    key: c.key,
    title: c.title,
    isRequired: c.isRequired,
  }));

  // Add custom courses
  allCourseKeys.forEach((key) => {
    if (!courses.find((c) => c.key === key)) {
      const training = matrix
        .flatMap((m) => m.trainings)
        .find((t) => t.courseKey === key);
      if (training) {
        courses.push({
          key,
          title: training.title,
          isRequired: false,
        });
      }
    }
  });

  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/training/matrix-pdf");
      if (!response.ok) throw new Error("PDF generation failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kompetansematrise-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
          <Button onClick={handleExportPDF} variant="outline" className="print:hidden">
            <Download className="mr-2 h-4 w-4" />
            Eksporter til PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div 
            className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
            ref={tableRef}
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#D1D5DB #F3F4F6'
            }}
          >
            <table className="w-full border-collapse min-w-max table-fixed"
              style={{ minWidth: `${120 + (courses.length * 160)}px` }}
            >
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold bg-muted/50 sticky left-0 z-10 bg-background border-r w-[120px]">
                  Ansatt
                </th>
                {courses.map((course) => (
                  <th
                    key={course.key}
                    className="text-center p-3 font-semibold bg-muted/50 w-[160px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm">{course.title}</span>
                      {course.isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Påkrevd
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((item) => (
                <tr key={item.user.id} className="border-b hover:bg-muted/20">
                  <td className="p-3 font-medium sticky left-0 bg-background z-10 border-r w-[120px]">
                    <div className="min-w-[100px]">
                      <div className="font-semibold">{item.user.name || "Ukjent"}</div>
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
                        <td key={course.key} className="p-3 text-center w-[160px]">
                          {course.isRequired ? (
                            <div className="flex flex-col items-center gap-1">
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="text-xs text-red-600 font-medium">
                                Mangler
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    }

                    const status = getTrainingStatus(training);

                    return (
                      <td key={course.key} className="p-3 text-center w-[160px]">
                        <div className="flex flex-col items-center gap-2">
                          {getStatusIcon(status)}
                          {getStatusBadge(status)}
                          {training.validUntil && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(training.validUntil).toLocaleDateString("nb-NO", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                              })}
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
          
          {/* Scroll hint */}
          <div className="text-center text-sm text-muted-foreground mt-2 md:hidden">
            ← Scroll sideveis for å se alle kurs →
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 items-center justify-center border-t pt-4">
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
      </CardContent>
    </Card>
  );
}

