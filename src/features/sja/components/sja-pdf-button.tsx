"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getSjaStatusLabel,
  getSjaConclusionLabel,
  getRiskLabel,
} from "@/features/sja/schemas/sja.schema";

interface SjaPdfButtonProps {
  analysis: {
    id: string;
    sjaNummer?: string | null;
    title: string;
    description?: string | null;
    workLocation: string;
    plannedDate: string | Date;
    responsibleName: string;
    createdByName?: string | null;
    participants?: string | null;
    additionalConditions?: string | null;
    weatherConditions?: string | null;
    status: string;
    conclusion: string;
    conclusionComment?: string | null;
    electricalWorkType: string;
    workMethod?: string | null;
    requiredEquipment?: string | null;
    requiredPpe?: string | null;
    personnelRequirements?: string | null;
    safetyConditions?: string | null;
    approvedAt?: string | Date | null;
    approvedByName?: string | null;
    createdAt: string | Date;
    templateName?: string | null;
    hazards: Array<{
      activity: string;
      hazard: string;
      consequence?: string | null;
      probability: number;
      severity: number;
      riskLevel: number;
      measures: string;
      responsibleName?: string | null;
      completed?: boolean;
    }>;
    participantRecords: Array<{
      name: string;
      isExternal?: boolean;
      competenceStatus?: string;
    }>;
  };
}

export function SjaPdfButton({ analysis }: SjaPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.width;
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const addPageIfNeeded = (needed: number) => {
        if (y + needed > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = margin;
        }
      };

      const sectionTitle = (title: string) => {
        addPageIfNeeded(14);
        y += 4;
        doc.setFillColor(71, 85, 105);
        doc.rect(margin, y, contentW, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 3, y + 5.5);
        y += 12;
        doc.setTextColor(0, 0, 0);
      };

      const labelValue = (label: string, value: string, maxWidth?: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(label, margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(value, maxWidth ?? contentW);
        addPageIfNeeded(lines.length * 4 + 2);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 2;
      };

      const formatDate = (d: string | Date | null | undefined) => {
        if (!d) return "-";
        return new Date(d).toLocaleString("no-NO", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      };

      // --- HEADER ---
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("Sikker Jobb-Analyse (SJA)", margin, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(analysis.title, margin, 19);
      if (analysis.sjaNummer) {
        doc.setFontSize(8);
        doc.text(analysis.sjaNummer, margin, 24);
      }

      // Status badge top right
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const statusText = `${getSjaStatusLabel(analysis.status as any)} | ${getSjaConclusionLabel(analysis.conclusion as any)}`;
      doc.text(statusText, pageW - margin, 12, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Generert: ${new Date().toLocaleDateString("nb-NO")}`, pageW - margin, 19, { align: "right" });

      y = 34;

      // --- GRUNNINFO ---
      sectionTitle("1. Grunnleggende informasjon");

      const infoRows = [
        ["Arbeidssted", analysis.workLocation],
        ["Planlagt dato", formatDate(analysis.plannedDate)],
        ["Ansvarlig", analysis.responsibleName],
        ["Opprettet av", analysis.createdByName ?? "-"],
        ["Opprettet", formatDate(analysis.createdAt)],
      ];
      if (analysis.approvedAt) {
        infoRows.push(["Godkjent", `${formatDate(analysis.approvedAt)}${analysis.approvedByName ? ` av ${analysis.approvedByName}` : ""}`]);
      }
      if (analysis.templateName) {
        infoRows.push(["Mal", analysis.templateName]);
      }

      autoTable(doc, {
        startY: y,
        body: infoRows,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35, textColor: [100, 100, 100] },
          1: { cellWidth: contentW - 35 },
        },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 4;

      if (analysis.description) {
        labelValue("Beskrivelse av arbeidet", analysis.description);
      }

      // --- DELTAKERE ---
      if (analysis.participants || analysis.participantRecords.length > 0) {
        sectionTitle("2. Deltakere");
        if (analysis.participants) {
          labelValue("Alle som deltar i arbeidet", analysis.participants);
        }
        if (analysis.participantRecords.length > 0) {
          const partRows = analysis.participantRecords.map((p) => [
            p.name,
            p.isExternal ? "Ekstern" : "Intern",
            p.competenceStatus ?? "-",
          ]);
          autoTable(doc, {
            startY: y,
            head: [["Navn", "Type", "Kompetanse"]],
            body: partRows,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: "bold" },
            margin: { left: margin, right: margin },
          });
          y = (doc as any).lastAutoTable.finalY + 4;
        }
      }

      // --- SPESIELLE FORHOLD ---
      if (analysis.weatherConditions || analysis.additionalConditions) {
        sectionTitle("3. Spesielle forhold");
        if (analysis.weatherConditions) {
          labelValue("Værforhold", analysis.weatherConditions);
        }
        if (analysis.additionalConditions) {
          labelValue("Tilleggsforhold / endringer", analysis.additionalConditions);
        }
      }

      // --- FSE ---
      if (analysis.electricalWorkType !== "NOT_APPLICABLE") {
        sectionTitle("FSE og arbeidsforutsetninger");
        const fseFields = [
          ["Arbeidsmetode", analysis.workMethod],
          ["Nødvendig utstyr", analysis.requiredEquipment],
          ["Personlig verneutstyr", analysis.requiredPpe],
          ["Krav til personell", analysis.personnelRequirements],
          ["Sikkerhetsbetingelser", analysis.safetyConditions],
        ] as const;
        for (const [label, val] of fseFields) {
          if (val) labelValue(label, val);
        }
      }

      // --- FAREIDENTIFIKASJON ---
      sectionTitle("4. Fareidentifikasjon og tiltak");

      const maxRisk = analysis.hazards.length > 0
        ? Math.max(...analysis.hazards.map((h) => h.riskLevel))
        : 0;

      if (maxRisk > 0) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`Høyeste risikonivå: ${maxRisk} – ${getRiskLabel(maxRisk)}`, margin, y);
        y += 6;
      }

      for (let i = 0; i < analysis.hazards.length; i++) {
        const h = analysis.hazards[i];
        addPageIfNeeded(40);

        // Hazard header
        doc.setFillColor(
          h.riskLevel >= 15 ? 220 : h.riskLevel >= 10 ? 234 : h.riskLevel >= 5 ? 250 : 220,
          h.riskLevel >= 15 ? 38 : h.riskLevel >= 10 ? 88 : h.riskLevel >= 5 ? 204 : 252,
          h.riskLevel >= 15 ? 38 : h.riskLevel >= 10 ? 12 : h.riskLevel >= 5 ? 0 : 231,
        );
        doc.rect(margin, y, contentW, 7, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(h.riskLevel >= 5 ? 255 : 0);
        doc.text(`Fare #${i + 1}: ${h.activity}`, margin + 2, y + 5);
        doc.text(`Risiko: ${h.riskLevel} (${h.probability}×${h.severity})`, pageW - margin - 2, y + 5, { align: "right" });
        doc.setTextColor(0, 0, 0);
        y += 10;

        const hazardData = [
          ["Fare / risiko", h.hazard],
        ];
        if (h.consequence) hazardData.push(["Mulig konsekvens", h.consequence]);
        hazardData.push(["Tiltak / barrierer", h.measures]);
        if (h.responsibleName) hazardData.push(["Ansvarlig for tiltak", h.responsibleName]);
        if (h.completed) hazardData.push(["Status", "✓ Tiltak gjennomført"]);

        autoTable(doc, {
          startY: y,
          body: hazardData,
          theme: "plain",
          styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 35, textColor: [100, 100, 100] },
            1: { cellWidth: contentW - 35 },
          },
          margin: { left: margin + 2, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      // --- KONKLUSJON ---
      if (analysis.conclusionComment) {
        sectionTitle("5. Konklusjon");
        labelValue("Konklusjonskommentar", analysis.conclusionComment);
      }

      // --- FOOTER ---
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `HMS Nova – Sikker Jobb-Analyse | Side ${p} av ${totalPages}`,
          pageW / 2,
          doc.internal.pageSize.height - 8,
          { align: "center" },
        );
      }

      const filename = `SJA-${analysis.sjaNummer || analysis.id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);

      toast({ title: "PDF generert", description: `${filename} er lastet ned` });
    } catch (error) {
      console.error("SJA PDF error:", error);
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke generere PDF" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      {loading ? "Genererer..." : "Last ned PDF"}
    </Button>
  );
}
