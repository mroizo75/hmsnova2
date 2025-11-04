/**
 * PDF Generator for Inspections (Vernerunde/HMS-inspeksjoner)
 * Generates professional PDF reports
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface InspectionData {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  scheduledDate: Date;
  completedDate?: Date | null;
  location?: string | null;
  conductedBy: string;
  participants?: string | null;
  findings: Array<{
    id: string;
    title: string;
    description: string;
    severity: number;
    location?: string | null;
    status: string;
    responsibleId?: string | null;
    dueDate?: Date | null;
    createdAt: Date;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  VERNERUNDE: "Vernerunde",
  HMS_INSPEKSJON: "HMS-inspeksjon",
  BRANNØVELSE: "Brannøvelse",
  SHA_PLAN: "SHA-plan",
  SIKKERHETSVANDRING: "Sikkerhetsvandring",
  ANDRE: "Annet",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlagt",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
  CANCELLED: "Avbrutt",
};

const FINDING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Åpen",
  IN_PROGRESS: "Under arbeid",
  RESOLVED: "Løst",
  CLOSED: "Lukket",
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Lav",
  2: "Middels-lav",
  3: "Middels",
  4: "Middels-høy",
  5: "Kritisk",
};

export async function generateInspectionReport(inspection: InspectionData): Promise<Buffer> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 20;

  // Logo/Header (optional - add your logo here)
  pdf.setFillColor(20, 83, 45); // HMS Nova green
  pdf.rect(0, 0, pageWidth, 15, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("HMS NOVA", 20, 10);
  
  pdf.setTextColor(0, 0, 0);
  yPos = 25;

  // Title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text(TYPE_LABELS[inspection.type] || inspection.type, 20, yPos);
  yPos += 10;

  pdf.setFontSize(14);
  pdf.text(inspection.title, 20, yPos);
  yPos += 15;

  // Metadata
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  
  const metadata = [
    ["Status:", STATUS_LABELS[inspection.status] || inspection.status],
    ["Planlagt dato:", format(new Date(inspection.scheduledDate), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })],
    ...(inspection.completedDate 
      ? [["Gjennomført:", format(new Date(inspection.completedDate), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })]] 
      : []
    ),
    ...(inspection.location ? [["Lokasjon:", inspection.location]] : []),
    ["Gjennomført av:", inspection.conductedBy],
    ["Antall funn:", String(inspection.findings.length)],
    ["Åpne funn:", String(inspection.findings.filter(f => f.status === "OPEN").length)],
  ];

  metadata.forEach(([label, value]) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, 20, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, 70, yPos);
    yPos += 6;
  });

  yPos += 5;

  // Description
  if (inspection.description) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Beskrivelse:", 20, yPos);
    yPos += 6;
    
    pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(inspection.description, pageWidth - 40);
    pdf.text(descLines, 20, yPos);
    yPos += descLines.length * 5 + 10;
  }

  // Findings Table
  if (inspection.findings.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Funn og avvik:", 20, yPos);
    yPos += 8;

    const findingsData = inspection.findings.map((finding, index) => [
      String(index + 1),
      finding.title,
      SEVERITY_LABELS[finding.severity] || String(finding.severity),
      FINDING_STATUS_LABELS[finding.status] || finding.status,
      finding.dueDate ? format(new Date(finding.dueDate), "dd.MM.yyyy", { locale: nb }) : "-",
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: [["#", "Funn", "Alvorlighet", "Status", "Frist"]],
      body: findingsData,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 83, 45], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 80 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
      },
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Detailed findings
    pdf.addPage();
    yPos = 20;
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Detaljert beskrivelse av funn", 20, yPos);
    yPos += 12;

    inspection.findings.forEach((finding, index) => {
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${index + 1}. ${finding.title}`, 20, yPos);
      yPos += 6;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      
      pdf.setFont("helvetica", "bold");
      pdf.text("Alvorlighet:", 25, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(SEVERITY_LABELS[finding.severity] || String(finding.severity), 60, yPos);
      yPos += 5;

      pdf.setFont("helvetica", "bold");
      pdf.text("Status:", 25, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(FINDING_STATUS_LABELS[finding.status] || finding.status, 60, yPos);
      yPos += 5;

      if (finding.location) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Lokasjon:", 25, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(finding.location, 60, yPos);
        yPos += 5;
      }

      if (finding.dueDate) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Frist:", 25, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(format(new Date(finding.dueDate), "d. MMMM yyyy", { locale: nb }), 60, yPos);
        yPos += 5;
      }

      pdf.setFont("helvetica", "bold");
      pdf.text("Beskrivelse:", 25, yPos);
      yPos += 5;
      
      pdf.setFont("helvetica", "normal");
      const descLines = pdf.splitTextToSize(finding.description, pageWidth - 50);
      pdf.text(descLines, 25, yPos);
      yPos += descLines.length * 4 + 10;
    });
  }

  // Footer
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `Side ${i} av ${totalPages} | Generert ${format(new Date(), "d. MMMM yyyy", { locale: nb })} | HMS Nova`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
  return pdfBuffer;
}

