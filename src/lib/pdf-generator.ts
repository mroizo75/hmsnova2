/**
 * PDF Generator using jsPDF
 */

import { jsPDF } from "jspdf";
import { INDUSTRY_RISKS } from "@/features/document-generator/data/industry-risks";
import { INDUSTRY_TRAINING } from "@/features/document-generator/data/industry-training";

export async function generateHMSHandbook(data: any): Promise<Buffer> {
  const pdf = new jsPDF();
  const risks = INDUSTRY_RISKS[data.industry] || [];
  const training = INDUSTRY_TRAINING[data.industry] || [];
  
  let yPos = 20;
  const lineHeight = 7;
  const pageHeight = pdf.internal.pageSize.height;
  const marginBottom = 20;

  const addText = (text: string, fontSize = 12, fontStyle: "normal" | "bold" = "normal") => {
    pdf.setFontSize(fontSize);
    if (fontStyle === "bold") {
      pdf.setFont("helvetica", "bold");
    } else {
      pdf.setFont("helvetica", "normal");
    }
    
    const lines = pdf.splitTextToSize(text, 170);
    
    if (yPos + (lines.length * lineHeight) > pageHeight - marginBottom) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.text(lines, 20, yPos);
    yPos += lines.length * lineHeight;
  };

  // Header
  addText("HMS-HÅNDBOK", 20, "bold");
  addText(data.companyName, 16, "bold");
  yPos += 5;
  addText(`Generert: ${new Date().toLocaleDateString("no-NO")}`, 10);
  yPos += 10;

  // Om bedriften
  addText("OM BEDRIFTEN", 14, "bold");
  addText(`Bedriftsnavn: ${data.companyName}`);
  if (data.orgNumber) addText(`Org.nr: ${data.orgNumber}`);
  addText(`Daglig leder: ${data.ceoName}`);
  addText(`E-post: ${data.email}`);
  yPos += 10;

  // HMS-organisering
  addText("HMS-ORGANISERING", 14, "bold");
  addText(`HMS-ansvarlig: ${data.hmsResponsible}`);
  if (data.safetyRep) addText(`Verneombud: ${data.safetyRep}`);
  if (data.bhtProvider) addText(`BHT: ${data.bhtProvider}`);
  yPos += 10;

  // HMS Policy
  addText("HMS-POLICY", 14, "bold");
  addText(`${data.companyName} har som mål å skape en arbeidsplass der helse, miljø og sikkerhet står i fokus.`);
  yPos += 5;
  addText("Våre prinsipper:", 12, "bold");
  addText("- Alle arbeidsskader og sykdommer kan forebygges");
  addText("- Sikkerhet er alles ansvar");
  addText("- Vi følger alle lovkrav og går lenger der det trengs");
  yPos += 10;

  // Risikovurdering
  addText("RISIKOVURDERING", 14, "bold");
  risks.slice(0, 15).forEach((risk, i) => {
    addText(`${i + 1}. ${risk.hazard} (Risiko: ${risk.riskScore})`);
  });
  yPos += 10;

  // Opplæring
  addText("OPPLÆRING", 14, "bold");
  training.slice(0, 10).forEach((course, i) => {
    addText(`${i + 1}. ${course.name} - ${course.duration}`);
  });

  // Footer
  yPos = pageHeight - 15;
  addText("Dette er en forenklet versjon. Bruk HMS Nova for komplett dokumentasjon.", 10);

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
  return pdfBuffer;
}

export async function generateTrainingPlan(data: any): Promise<Buffer> {
  const pdf = new jsPDF();
  const training = INDUSTRY_TRAINING[data.industry] || [];
  
  let yPos = 20;
  const lineHeight = 7;

  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("OPPLÆRINGSPLAN 2025", 20, yPos);
  yPos += 15;

  pdf.setFontSize(16);
  pdf.text(data.companyName, 20, yPos);
  yPos += 15;

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("PÅKREVD OPPLÆRING:", 20, yPos);
  yPos += 10;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");

  training.forEach((course, i) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.setFont("helvetica", "bold");
    pdf.text(`${i + 1}. ${course.name}`, 20, yPos);
    yPos += 7;
    
    pdf.setFont("helvetica", "normal");
    pdf.text(`Varighet: ${course.duration}`, 25, yPos);
    yPos += 7;
    pdf.text(`Frekvens: ${course.frequency}`, 25, yPos);
    yPos += 7;
    pdf.text(`Status: ${course.required ? "Lovpålagt" : "Anbefalt"}`, 25, yPos);
    yPos += 10;
  });

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
  return pdfBuffer;
}
