"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";

interface Attachment {
  id: string;
  fileKey: string;
  name: string;
  mime: string;
}

interface Measure {
  id: string;
  description: string;
  responsibleName?: string | null;
  deadline: Date | null;
  status: string;
  completedAt: Date | null;
}

interface IncidentData {
  avviksnummer?: string | null;
  title: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  occurredAt: Date | null;
  location?: string | null;
  projectReference?: string | null;
  witnessName?: string | null;
  immediateAction?: string | null;
  rootCause?: string | null;
  contributingFactors?: string | null;
  effectivenessReview?: string | null;
  lessonsLearned?: string | null;
  attachments: Attachment[];
  measures: Measure[];
  createdAt: Date;
  closedAt?: Date | null;
}

interface IncidentPDFExportProps {
  incident: IncidentData;
  typeLabel: string;
  severityLabel: string;
  statusLabel: string;
}

export function IncidentPDFExport({ incident, typeLabel, severityLabel, statusLabel }: IncidentPDFExportProps) {
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

  const getMeasureStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return "Planlagt";
      case "IN_PROGRESS": return "Pågår";
      case "DONE": return "Ferdig";
      default: return status;
    }
  };

  const loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Failed to load image:", error);
      return "";
    }
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
      const maxWidth = pageWidth - (margin * 2);

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace: number = 20) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Avviksrapport", margin, yPos);
      yPos += 6;
      if (incident.avviksnummer) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Avviksnummer: ${incident.avviksnummer}`, margin, yPos);
        yPos += 4;
      }
      yPos += 4;

      // Metadata badges
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Type: ${typeLabel} | Alvorlighet: ${severityLabel} | Status: ${statusLabel}`, margin, yPos);
      doc.setTextColor(0);
      yPos += 10;

      // Separator
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(incident.title, maxWidth);
      doc.text(titleLines, margin, yPos);
      yPos += (titleLines.length * 7) + 5;

      // Description section
      checkPageBreak(30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Beskrivelse", margin, yPos);
      yPos += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(incident.description, maxWidth);
      doc.text(descLines, margin, yPos);
      yPos += (descLines.length * 5) + 8;

      // Details grid
      checkPageBreak(40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detaljer", margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      
      // Tidspunkt
      doc.text("Tidspunkt:", margin, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(incident.occurredAt), margin + 30, yPos);
      yPos += 6;

      // Location
      if (incident.location) {
        doc.setFont("helvetica", "bold");
        doc.text("Sted:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(incident.location, margin + 30, yPos);
        yPos += 6;
      }

      // Prosjektnummer/referanse for oppdrag som ikke er registrert som prosjekt
      if (incident.projectReference) {
        doc.setFont("helvetica", "bold");
        doc.text("Prosjektnr.:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(incident.projectReference, margin + 30, yPos);
        yPos += 6;
      }

      // Witness
      if (incident.witnessName) {
        doc.setFont("helvetica", "bold");
        doc.text("Vitner:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(incident.witnessName, margin + 30, yPos);
        yPos += 6;
      }

      yPos += 4;

      // Immediate action
      if (incident.immediateAction) {
        checkPageBreak(25);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Umiddelbare tiltak", margin, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const actionLines = doc.splitTextToSize(incident.immediateAction, maxWidth);
        doc.text(actionLines, margin, yPos);
        yPos += (actionLines.length * 5) + 8;
      }

      // Images
      if (incident.attachments && incident.attachments.length > 0) {
        const images = incident.attachments.filter(a => a.mime.startsWith("image/"));
        
        if (images.length > 0) {
          checkPageBreak(50);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`Bilder (${images.length})`, margin, yPos);
          yPos += 8;

          for (const image of images) {
            try {
              const base64Image = await loadImageAsBase64(`/api/files/${image.fileKey}`);
              if (base64Image) {
                checkPageBreak(80);
                
                // Calculate image dimensions (max width 80mm, maintain aspect ratio)
                const imgWidth = 80;
                const imgHeight = 60; // Approximate, will be adjusted by jsPDF
                
                doc.addImage(base64Image, "JPEG", margin, yPos, imgWidth, imgHeight);
                yPos += imgHeight + 3;

                // Image caption
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(image.name, margin, yPos);
                doc.setTextColor(0);
                yPos += 8;
              }
            } catch (error) {
              console.error("Failed to add image to PDF:", error);
            }
          }
        }
      }

      // Root cause analysis
      if (incident.rootCause) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Årsaksanalyse", margin, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Grunnårsak:", margin, yPos);
        yPos += 5;

        doc.setFont("helvetica", "normal");
        const rootCauseLines = doc.splitTextToSize(incident.rootCause, maxWidth);
        doc.text(rootCauseLines, margin, yPos);
        yPos += (rootCauseLines.length * 5) + 6;

        if (incident.contributingFactors) {
          checkPageBreak(20);
          doc.setFont("helvetica", "bold");
          doc.text("Medvirkende faktorer:", margin, yPos);
          yPos += 5;

          doc.setFont("helvetica", "normal");
          const factorsLines = doc.splitTextToSize(incident.contributingFactors, maxWidth);
          doc.text(factorsLines, margin, yPos);
          yPos += (factorsLines.length * 5) + 8;
        }
      }

      // Measures
      if (incident.measures && incident.measures.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Korrigerende tiltak (${incident.measures.length})`, margin, yPos);
        yPos += 8;

        doc.setFontSize(9);
        incident.measures.forEach((measure, index) => {
          checkPageBreak(25);
          
          doc.setFont("helvetica", "bold");
          doc.text(`${index + 1}. ${getMeasureStatusLabel(measure.status)}`, margin, yPos);
          yPos += 5;

          doc.setFont("helvetica", "normal");
          const measureLines = doc.splitTextToSize(measure.description, maxWidth - 5);
          doc.text(measureLines, margin + 5, yPos);
          yPos += (measureLines.length * 4) + 3;

          if (measure.responsibleName) {
            doc.setTextColor(100);
            doc.text(`Ansvarlig: ${measure.responsibleName}`, margin + 5, yPos);
            yPos += 4;
          }

          if (measure.deadline) {
            doc.setTextColor(100);
            doc.text(`Frist: ${formatDate(measure.deadline)}`, margin + 5, yPos);
            yPos += 4;
          }

          doc.setTextColor(0);
          yPos += 4;
        });
      }

      // Closure information
      if (incident.status === "CLOSED") {
        checkPageBreak(35);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Avslutning", margin, yPos);
        yPos += 6;

        if (incident.effectivenessReview) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Effektivitetsvurdering:", margin, yPos);
          yPos += 5;

          doc.setFont("helvetica", "normal");
          const reviewLines = doc.splitTextToSize(incident.effectivenessReview, maxWidth);
          doc.text(reviewLines, margin, yPos);
          yPos += (reviewLines.length * 5) + 6;
        }

        if (incident.lessonsLearned) {
          checkPageBreak(20);
          doc.setFont("helvetica", "bold");
          doc.text("Læringspunkter:", margin, yPos);
          yPos += 5;

          doc.setFont("helvetica", "normal");
          const lessonsLines = doc.splitTextToSize(incident.lessonsLearned, maxWidth);
          doc.text(lessonsLines, margin, yPos);
          yPos += (lessonsLines.length * 5) + 6;
        }

        if (incident.closedAt) {
          doc.setTextColor(100);
          doc.setFontSize(9);
          doc.text(`Lukket: ${formatDate(incident.closedAt)}`, margin, yPos);
          doc.setTextColor(0);
        }
      }

      // Footer on last page
      doc.setFontSize(8);
      doc.setTextColor(150);
      const footerText = `Generert: ${formatDate(new Date())} | HMS Nova`;
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });

      // Save
      const fileName = `avvik-${incident.title.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Kunne ikke generere PDF. Vennligst prøv igjen.");
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

