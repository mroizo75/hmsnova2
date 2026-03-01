"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

interface RuhReportData {
  ruhNummer?: string | null;
  title: string;
  category: string;
  description: string;
  occurredAt: Date | null;
  location?: string | null;
  reportedBy: string;
  involvedPersons?: string | null;
  witnessName?: string | null;
  injuryOccurred: boolean;
  injuryDescription?: string | null;
  immediateAction?: string | null;
  suggestedActions?: string | null;
  status: string;
  reviewComment?: string | null;
  completedComment?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}

interface RuhPDFExportProps {
  report: RuhReportData;
  categoryLabel: string;
  statusLabel: string;
}

export function RuhPDFExport({ report, categoryLabel, statusLabel }: RuhPDFExportProps) {
  const [generating, setGenerating] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("no-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let yPos = 20;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;

      const checkPageBreak = (requiredSpace: number = 20) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      const addSection = (title: string, content: string) => {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(content, maxWidth);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5 + 8;
      };

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport om Uonsket Hendelse (RUH)", margin, yPos);
      yPos += 6;
      if (report.ruhNummer) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Referanse: ${report.ruhNummer}`, margin, yPos);
        yPos += 4;
      }
      yPos += 4;

      // Metadata
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(
        `Kategori: ${categoryLabel} | Status: ${statusLabel}`,
        margin,
        yPos
      );
      doc.setTextColor(0);
      yPos += 10;

      // Separator
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(report.title, maxWidth);
      doc.text(titleLines, margin, yPos);
      yPos += titleLines.length * 7 + 5;

      // Details grid
      checkPageBreak(40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detaljer", margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      const addDetail = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 40, yPos);
        yPos += 6;
      };

      addDetail("Hendelsesdato", formatDate(report.occurredAt));
      if (report.location) addDetail("Sted", report.location);
      addDetail("Rapportert av", report.reportedBy);
      if (report.witnessName) addDetail("Vitner", report.witnessName);
      addDetail("Personskade", report.injuryOccurred ? "Ja" : "Nei");
      addDetail("Innsendt", formatDate(report.createdAt));
      yPos += 4;

      // Description
      addSection("Beskrivelse av hendelsen", report.description);

      // Involved persons
      if (report.involvedPersons) {
        addSection("Involverte personer", report.involvedPersons);
      }

      // Injury
      if (report.injuryOccurred && report.injuryDescription) {
        addSection("Skadebeskrivelse", report.injuryDescription);
      }

      // Immediate action
      if (report.immediateAction) {
        addSection("Umiddelbare tiltak", report.immediateAction);
      }

      // Suggested actions
      if (report.suggestedActions) {
        addSection("Foreslatte forebyggende tiltak", report.suggestedActions);
      }

      // Review/completion comments
      if (report.reviewComment) {
        addSection("Vurderingskommentar", report.reviewComment);
      }

      if (report.completedComment) {
        addSection("Avslutningskommentar", report.completedComment);
      }

      if (report.completedAt) {
        checkPageBreak(15);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Ferdigbehandlet: ${formatDate(report.completedAt)}`, margin, yPos);
        doc.setTextColor(0);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerText = `Generert: ${formatDate(new Date())} | HMS Nova`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });

      const fileName = `ruh-${report.ruhNummer || report.title.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch {
      alert("Kunne ikke generere PDF. Vennligst prov igjen.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
      variant="outline"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {generating ? "Genererer PDF..." : "Last ned som PDF"}
    </Button>
  );
}
