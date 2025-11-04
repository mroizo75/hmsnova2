/**
 * PDF Generator for Audits (ISO 9001 Revisjoner)
 * Generates professional PDF audit reports
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface AuditData {
  id: string;
  title: string;
  auditType: string;
  scope: string;
  criteria: string;
  scheduledDate: Date;
  completedAt?: Date | null;
  area: string;
  department?: string | null;
  status: string;
  summary?: string | null;
  conclusion?: string | null;
  findings: Array<{
    id: string;
    findingType: string;
    clause: string;
    description: string;
    evidence: string;
    requirement: string;
    status: string;
    dueDate?: Date | null;
    correctiveAction?: string | null;
    rootCause?: string | null;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Internrevisjon",
  EXTERNAL: "Eksternrevisjon",
  CERTIFICATION: "Sertifisering",
  SUPPLIER: "Leverandørrevisjon",
  FOLLOW_UP: "Oppfølging",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlagt",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
  CANCELLED: "Avbrutt",
};

const FINDING_TYPE_LABELS: Record<string, string> = {
  MAJOR_NC: "Større avvik (Major NC)",
  MINOR_NC: "Mindre avvik (Minor NC)",
  OBSERVATION: "Observasjon",
};

export async function generateAuditReport(audit: AuditData): Promise<Buffer> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  pdf.setFillColor(20, 83, 45);
  pdf.rect(0, 0, pageWidth, 15, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("HMS NOVA - ISO 9001 REVISJON", 20, 10);
  
  pdf.setTextColor(0, 0, 0);
  yPos = 25;

  // Title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("REVISJONSRAPPORT", 20, yPos);
  yPos += 10;

  pdf.setFontSize(14);
  pdf.text(audit.title, 20, yPos);
  yPos += 15;

  // Metadata Section
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, yPos - 5, pageWidth - 30, 50, "F");
  
  pdf.setFontSize(10);
  const metadata = [
    ["Type:", TYPE_LABELS[audit.auditType] || audit.auditType],
    ["Område:", audit.area],
    ...(audit.department ? [["Avdeling:", audit.department]] : []),
    ["Status:", STATUS_LABELS[audit.status] || audit.status],
    ["Planlagt dato:", format(new Date(audit.scheduledDate), "d. MMMM yyyy", { locale: nb })],
    ...(audit.completedAt 
      ? [["Gjennomført:", format(new Date(audit.completedAt), "d. MMMM yyyy", { locale: nb })]] 
      : []
    ),
  ];

  let metaYPos = yPos;
  metadata.forEach(([label, value]) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, 20, metaYPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, 70, metaYPos);
    metaYPos += 6;
  });

  yPos = metaYPos + 10;

  // Scope (ISO 9001)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Revisjonens omfang (ISO 9001 - 9.2.2a):", 20, yPos);
  yPos += 6;
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const scopeLines = pdf.splitTextToSize(audit.scope, pageWidth - 40);
  pdf.text(scopeLines, 20, yPos);
  yPos += scopeLines.length * 5 + 8;

  // Criteria (ISO 9001)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Revisjonskriterier (ISO 9001 - 9.2.2b):", 20, yPos);
  yPos += 6;
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const criteriaLines = pdf.splitTextToSize(audit.criteria, pageWidth - 40);
  pdf.text(criteriaLines, 20, yPos);
  yPos += criteriaLines.length * 5 + 10;

  // Summary (if available)
  if (audit.summary) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Oppsummering:", 20, yPos);
    yPos += 6;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const summaryLines = pdf.splitTextToSize(audit.summary, pageWidth - 40);
    pdf.text(summaryLines, 20, yPos);
    yPos += summaryLines.length * 5 + 10;
  }

  // Findings Summary
  const majorNc = audit.findings.filter(f => f.findingType === "MAJOR_NC").length;
  const minorNc = audit.findings.filter(f => f.findingType === "MINOR_NC").length;
  const observations = audit.findings.filter(f => f.findingType === "OBSERVATION").length;

  pdf.setFillColor(255, 243, 205);
  pdf.rect(15, yPos - 5, pageWidth - 30, 25, "F");
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Funn oppsummering:", 20, yPos);
  yPos += 7;
  
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`• Større avvik (Major NC): ${majorNc}`, 20, yPos);
  yPos += 5;
  pdf.text(`• Mindre avvik (Minor NC): ${minorNc}`, 20, yPos);
  yPos += 5;
  pdf.text(`• Observasjoner: ${observations}`, 20, yPos);
  yPos += 15;

  // Findings Table
  if (audit.findings.length > 0) {
    const findingsData = audit.findings.map((finding, index) => [
      String(index + 1),
      finding.clause,
      FINDING_TYPE_LABELS[finding.findingType] || finding.findingType,
      finding.description.substring(0, 60) + "...",
      finding.status,
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: [["#", "Klausul", "Type", "Beskrivelse", "Status"]],
      body: findingsData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 83, 45], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 20 },
        2: { cellWidth: 35 },
        3: { cellWidth: 85 },
        4: { cellWidth: 25 },
      },
    });

    yPos = (pdf as any).lastAutoTable.finalY + 15;

    // Detailed findings
    pdf.addPage();
    yPos = 20;
    
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Detaljerte funn", 20, yPos);
    yPos += 12;

    audit.findings.forEach((finding, index) => {
      if (yPos > 230) {
        pdf.addPage();
        yPos = 20;
      }

      // Finding header
      const bgColor = finding.findingType === "MAJOR_NC" ? [255, 230, 230] :
                     finding.findingType === "MINOR_NC" ? [255, 250, 200] : [240, 248, 255];
      
      pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      pdf.rect(15, yPos - 5, pageWidth - 30, 8, "F");

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Funn ${index + 1}: ${FINDING_TYPE_LABELS[finding.findingType]}`, 20, yPos);
      yPos += 10;

      pdf.setFontSize(9);
      
      // ISO Clause
      pdf.setFont("helvetica", "bold");
      pdf.text("ISO-klausul:", 25, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(finding.clause, 70, yPos);
      yPos += 6;

      // Requirement
      pdf.setFont("helvetica", "bold");
      pdf.text("Krav:", 25, yPos);
      yPos += 5;
      pdf.setFont("helvetica", "normal");
      const reqLines = pdf.splitTextToSize(finding.requirement, pageWidth - 50);
      pdf.text(reqLines, 25, yPos);
      yPos += reqLines.length * 4 + 3;

      // Description
      pdf.setFont("helvetica", "bold");
      pdf.text("Beskrivelse:", 25, yPos);
      yPos += 5;
      pdf.setFont("helvetica", "normal");
      const descLines = pdf.splitTextToSize(finding.description, pageWidth - 50);
      pdf.text(descLines, 25, yPos);
      yPos += descLines.length * 4 + 3;

      // Evidence
      pdf.setFont("helvetica", "bold");
      pdf.text("Bevis/Observasjon:", 25, yPos);
      yPos += 5;
      pdf.setFont("helvetica", "normal");
      const evidenceLines = pdf.splitTextToSize(finding.evidence, pageWidth - 50);
      pdf.text(evidenceLines, 25, yPos);
      yPos += evidenceLines.length * 4 + 3;

      // Corrective Action (if available)
      if (finding.correctiveAction) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Korrigerende tiltak:", 25, yPos);
        yPos += 5;
        pdf.setFont("helvetica", "normal");
        const actionLines = pdf.splitTextToSize(finding.correctiveAction, pageWidth - 50);
        pdf.text(actionLines, 25, yPos);
        yPos += actionLines.length * 4 + 3;
      }

      // Due Date
      if (finding.dueDate) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Frist:", 25, yPos);
        pdf.setFont("helvetica", "normal");
        pdf.text(format(new Date(finding.dueDate), "d. MMMM yyyy", { locale: nb }), 70, yPos);
        yPos += 6;
      }

      yPos += 5;
    });
  }

  // Conclusion (if available)
  if (audit.conclusion) {
    if (yPos > 230) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Konklusjon og anbefaling:", 20, yPos);
    yPos += 6;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const conclusionLines = pdf.splitTextToSize(audit.conclusion, pageWidth - 40);
    pdf.text(conclusionLines, 20, yPos);
  }

  // Footer
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `Side ${i} av ${totalPages} | ISO 9001:2015 | Generert ${format(new Date(), "d. MMMM yyyy", { locale: nb })} | HMS Nova`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
  return pdfBuffer;
}

