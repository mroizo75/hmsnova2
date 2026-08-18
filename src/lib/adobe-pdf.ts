/**
 * Adobe PDF Services - Profesjonell PDF-generering og konvertering
 * 
 * Bruker Adobe PDF Services API for:
 * - Generere PDF-rapporter fra templates
 * - Konvertere Word-dokumenter til PDF
 */

import { 
  ServicePrincipalCredentials, 
  PDFServices, 
  MimeType,
  DocumentMergeParams,
  DocumentMergeJob,
  DocumentMergeResult,
  CreatePDFJob,
  CreatePDFResult,
  ExtractPDFParams,
  ExtractElementType,
  ExtractPDFJob,
  ExtractPDFResult,
  PDFWatermarkJob,
  PDFWatermarkResult,
  PDFWatermarkParams,
  WatermarkAppearance,
  PageRanges,
  SDKError,
  ServiceUsageError,
  ServiceApiError
} from "@adobe/pdfservices-node-sdk";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID;
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET;

if (!ADOBE_CLIENT_ID) {
  console.warn("⚠️ ADOBE_CLIENT_ID mangler i .env - PDF-generering vil ikke fungere");
}

/**
 * Generer PDF for psykososial rapport
 */
export async function generateWellbeingReportPDF(
  reportData: any,
  tenantName: string
): Promise<Buffer> {
  try {
    if (!ADOBE_CLIENT_ID || !ADOBE_CLIENT_SECRET) {
      throw new Error("Adobe PDF Services er ikke konfigurert. Legg til ADOBE_CLIENT_ID og ADOBE_CLIENT_SECRET i .env");
    }

    // Opprett credentials
    const credentials = new ServicePrincipalCredentials({
      clientId: ADOBE_CLIENT_ID,
      clientSecret: ADOBE_CLIENT_SECRET,
    });

    // Opprett PDF Services instance
    const pdfServices = new PDFServices({ credentials });

    // Forbered JSON data for template
    const jsonData = prepareReportData(reportData, tenantName);

    // Last inn template (Word-dokument med merge fields)
    const templatePath = path.join(process.cwd(), "templates", "wellbeing-report-template.docx");
    
    // Sjekk om template eksisterer
    if (!fs.existsSync(templatePath)) {
      console.warn("⚠️ Template ikke funnet, genererer enkel PDF");
      return await generateSimplePDF(jsonData);
    }

    const templateStream = fs.createReadStream(templatePath);
    const inputAsset = await pdfServices.upload({
      readStream: templateStream,
      mimeType: MimeType.DOCX,
    });

    // Sett opp merge params
    const params = new DocumentMergeParams({ jsonDataForMerge: jsonData });

    // Opprett merge job
    const job = new DocumentMergeJob({ inputAsset, params });

    // Kjør jobben
    const pollingURL = await pdfServices.submit({ job });
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: DocumentMergeResult,
    });

    // Hent resultat
    const resultAsset = pdfServicesResponse.result.asset;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    // Konverter stream til buffer
    return await streamToBuffer(streamAsset.readStream as any);

  } catch (error) {
    console.error("❌ Feil ved PDF-generering:", error);
    
    if (error instanceof SDKError || error instanceof ServiceUsageError || error instanceof ServiceApiError) {
      console.error("Adobe API Error:", error.message);
    }
    
    throw new Error("Kunne ikke generere PDF-rapport");
  }
}

/**
 * Forbered data for Adobe template
 */
function prepareReportData(reportData: any, tenantName: string) {
  const currentDate = new Date().toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return {
    // Metadata
    tenantName,
    reportYear: reportData.year,
    generatedDate: currentDate,
    
    // Sammendrag
    totalResponses: reportData.totalResponses,
    overallScore: reportData.overallScore.toFixed(2),
    overallScoreText: getScoreText(reportData.overallScore),
    
    // Trend
    hasTrend: !!reportData.trend,
    trendChange: reportData.trend ? reportData.trend.change.toFixed(2) : "0",
    trendImproving: reportData.trend ? reportData.trend.improving : false,
    trendArrow: reportData.trend ? (reportData.trend.improving ? "↗️" : "↘️") : "→",
    previousYearScore: reportData.trend ? reportData.trend.previousYear.toFixed(2) : "N/A",
    
    // Seksjoner (array for template loop)
    sections: reportData.sectionAverages.map((section: any) => ({
      name: section.section,
      average: section.average.toFixed(2),
      scoreEmoji: section.average >= 3.5 ? "🟢" : section.average >= 2.5 ? "🟡" : "🔴",
      scoreText: getScoreText(section.average),
      trend: section.trend !== undefined ? section.trend.toFixed(2) : "N/A",
      trendArrow: section.trend ? (section.trend > 0 ? "↗️" : section.trend < 0 ? "↘️" : "→") : "→",
    })),
    
    // Kritiske hendelser
    hasCriticalIncidents: 
      reportData.criticalIncidents.mobbing > 0 ||
      reportData.criticalIncidents.trakassering > 0 ||
      reportData.criticalIncidents.press > 0 ||
      reportData.criticalIncidents.konflikter > 0,
    mobbingCount: reportData.criticalIncidents.mobbing,
    trakasseringCount: reportData.criticalIncidents.trakassering,
    pressCount: reportData.criticalIncidents.press,
    konfliktCount: reportData.criticalIncidents.konflikter,
    
    // Hovedutfordringer
    hasTopConcerns: reportData.topConcerns.length > 0,
    topConcerns: reportData.topConcerns.map((concern: string) => ({ name: concern })),
    
    // Tiltak og oppfølging
    generatedRisks: reportData.generatedRisks,
    implementedMeasures: reportData.implementedMeasures,
    
    // Konklusjon
    conclusionEmoji: reportData.overallScore >= 3.5 ? "✅" : reportData.overallScore >= 2.5 ? "⚠️" : "🔴",
    conclusionText: getConclusionText(reportData.overallScore, reportData.criticalIncidents),
    
    // Positive og negative tilbakemeldinger (første 5 av hver)
    hasPositiveFeedback: reportData.openFeedback[0]?.positive?.length > 0,
    positiveFeedback: reportData.openFeedback[0]?.positive?.slice(0, 5).map((text: string) => ({ text })) || [],
    
    hasNegativeFeedback: reportData.openFeedback[0]?.negative?.length > 0,
    negativeFeedback: reportData.openFeedback[0]?.negative?.slice(0, 5).map((text: string) => ({ text })) || [],
    
    hasSuggestions: reportData.openFeedback[0]?.suggestions?.length > 0,
    suggestions: reportData.openFeedback[0]?.suggestions?.slice(0, 5).map((text: string) => ({ text })) || [],
  };
}

/**
 * Hjelpefunksjon: Score til tekst
 */
function getScoreText(score: number): string {
  if (score >= 4.0) return "Svært godt";
  if (score >= 3.5) return "Godt";
  if (score >= 3.0) return "Tilfredsstillende";
  if (score >= 2.5) return "Middels";
  if (score >= 2.0) return "Dårlig";
  return "Svært dårlig";
}

/**
 * Hjelpefunksjon: Konklusjonstekst
 */
function getConclusionText(overallScore: number, criticalIncidents: any): string {
  let text = "";
  
  if (overallScore >= 3.5) {
    text = "Det psykososiale arbeidsmiljøet vurderes som tilfredsstillende. Fortsett det gode arbeidet med å opprettholde et godt arbeidsmiljø.";
  } else if (overallScore >= 2.5) {
    text = "Det psykososiale arbeidsmiljøet har forbedringsområder som må følges opp. Implementer foreslåtte tiltak og evaluer effekten.";
  } else {
    text = "Det psykososiale arbeidsmiljøet krever umiddelbar oppfølging og tiltak. Dette er et alvorlig avvik fra kravene i Arbeidsmiljøloven.";
  }
  
  const totalCritical = 
    criticalIncidents.mobbing +
    criticalIncidents.trakassering +
    criticalIncidents.press +
    criticalIncidents.konflikter;
    
  if (totalCritical > 0) {
    text += "\n\nVIKTIG: Kritiske forhold er rapportert og må håndteres umiddelbart i henhold til Arbeidsmiljøloven § 4-3.";
  }
  
  return text;
}

/**
 * Fallback: Generer enkel PDF uten template
 */
async function generateSimplePDF(data: any): Promise<Buffer> {
  // Generer en enkel HTML-basert PDF som fallback
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Psykososial Rapport ${data.reportYear}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #2c3e50; }
        .section { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Psykososialt Arbeidsmiljø - ${data.tenantName}</h1>
      <h2>Rapport for ${data.reportYear}</h2>
      <p><strong>Generert:</strong> ${data.generatedDate}</p>
      
      <div class="section">
        <h3>Sammendrag</h3>
        <p><strong>Antall besvarelser:</strong> ${data.totalResponses}</p>
        <p><strong>Samlet score:</strong> ${data.overallScore}/5 (${data.overallScoreText})</p>
      </div>
      
      <div class="section">
        <h3>Seksjonsvurdering</h3>
        <table>
          <tr>
            <th>Seksjon</th>
            <th>Score</th>
            <th>Vurdering</th>
          </tr>
          ${data.sections.map((s: any) => `
            <tr>
              <td>${s.name}</td>
              <td>${s.average}</td>
              <td>${s.scoreEmoji} ${s.scoreText}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      
      <div class="section">
        <h3>Konklusjon</h3>
        <p>${data.conclusionText}</p>
      </div>
    </body>
    </html>
  `;
  
  // For nå returner bare HTML som Buffer
  // I produksjon kan vi bruke Puppeteer eller lignende
  return Buffer.from(html, 'utf-8');
}

/**
 * Hjelpefunksjon: Stream til Buffer
 */
async function streamToBuffer(readStream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    readStream.on("end", () => resolve(Buffer.concat(chunks)));
    readStream.on("error", reject);
  });
}

/**
 * Genererer en én-side PDF brukt som vannmerke for gratis-prøvepakker.
 * Tekst: "Kun visning – HMS Nova gratis prøve" så innholdet ikke kan brukes som ferdig system uten å betale.
 */
const A4_MM = { width: 210, height: 297 };

export async function generateWatermarkPdfBuffer(): Promise<Buffer> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = A4_MM.width;
  const h = A4_MM.height;
  doc.setFontSize(28);
  doc.setTextColor(180, 180, 180);
  doc.setFont("helvetica", "bold");
  doc.text("Kun visning", w / 2, h / 2 - 8, { align: "center" });
  doc.text("HMS Nova gratis prøve", w / 2, h / 2 + 8, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Oppgrader for utskriftsklare dokumenter", w / 2, h / 2 + 24, { align: "center" });
  return Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
}

export interface ApplyWatermarkOptions {
  opacity?: number;
  appearOnForeground?: boolean;
}

/**
 * Legger vannmerke på PDF via Adobe PDF Services.
 * Brukes for gratis-prøvepakker slik at brukere ikke får utskriftsklare dokumenter uten å betale.
 */
export async function applyWatermarkToPdf(
  inputPdfBuffer: Buffer,
  watermarkPdfBuffer: Buffer,
  options: ApplyWatermarkOptions = {}
): Promise<Buffer> {
  const { opacity = 50, appearOnForeground = true } = options;

  if (!ADOBE_CLIENT_ID || !ADOBE_CLIENT_SECRET) {
    throw new Error("Adobe PDF Services er ikke konfigurert");
  }

  const credentials = new ServicePrincipalCredentials({
    clientId: ADOBE_CLIENT_ID,
    clientSecret: ADOBE_CLIENT_SECRET,
  });

  const pdfServices = new PDFServices({ credentials });

  const inputStream = Readable.from(inputPdfBuffer);
  const watermarkStream = Readable.from(watermarkPdfBuffer);

  const [inputAsset, watermarkAsset] = await pdfServices.uploadAssets({
    streamAssets: [
      { readStream: inputStream, mimeType: MimeType.PDF },
      { readStream: watermarkStream, mimeType: MimeType.PDF },
    ],
  });

  const watermarkAppearance = new WatermarkAppearance({
    appearOnForeground,
    opacity,
  });

  const pageRanges = new PageRanges();
  pageRanges.addAll();

  const params = new PDFWatermarkParams({
    watermarkAppearance,
    pageRanges,
  });

  const job = new PDFWatermarkJob({
    inputAsset,
    watermarkAsset,
    params,
  });

  const pollingURL = await pdfServices.submit({ job });
  const pdfServicesResponse = await pdfServices.getJobResult({
    pollingURL,
    resultType: PDFWatermarkResult,
  });

  const resultAsset = pdfServicesResponse.result.asset;
  const streamAsset = await pdfServices.getContent({ asset: resultAsset });

  return await streamToBuffer(streamAsset.readStream as any);
}

/**
 * Konverter Word-dokument til PDF
 * 
 * Støtter: .docx, .doc
 */
export async function convertDocumentToPDF(
  inputBuffer: Buffer,
  mimeType: string
): Promise<Buffer> {
  try {
    if (!ADOBE_CLIENT_ID || !ADOBE_CLIENT_SECRET) {
      throw new Error("Adobe PDF Services er ikke konfigurert");
    }

    const credentials = new ServicePrincipalCredentials({
      clientId: ADOBE_CLIENT_ID,
      clientSecret: ADOBE_CLIENT_SECRET,
    });

    const pdfServices = new PDFServices({ credentials });

    const inputStream = Readable.from(inputBuffer);
    
    let assetMimeType: MimeType;
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      assetMimeType = MimeType.DOCX;
    } else if (mimeType === "application/msword") {
      assetMimeType = MimeType.DOC;
    } else {
      throw new Error(`Ikke støttet filtype: ${mimeType}`);
    }

    const inputAsset = await pdfServices.upload({
      readStream: inputStream,
      mimeType: assetMimeType,
    });

    const job = new CreatePDFJob({ inputAsset });

    const pollingURL = await pdfServices.submit({ job });
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: CreatePDFResult,
    });

    const resultAsset = pdfServicesResponse.result.asset;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    return await streamToBuffer(streamAsset.readStream as any);

  } catch (error) {
    console.error("Feil ved PDF-konvertering:", error);
    
    if (error instanceof SDKError || error instanceof ServiceUsageError || error instanceof ServiceApiError) {
      console.error("Adobe API Error:", error.message);
    }
    
    throw new Error("Kunne ikke konvertere dokument til PDF");
  }
}

/**
 * Ekstraher tekst fra PDF med Adobe Extract API
 * Brukes for AI-analyse av sikkerhetsdatablad
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    if (!ADOBE_CLIENT_ID || !ADOBE_CLIENT_SECRET) {
      throw new Error("Adobe PDF Services er ikke konfigurert");
    }

    const credentials = new ServicePrincipalCredentials({
      clientId: ADOBE_CLIENT_ID,
      clientSecret: ADOBE_CLIENT_SECRET,
    });

    const pdfServices = new PDFServices({ credentials });

    const inputStream = Readable.from(pdfBuffer);
    const inputAsset = await pdfServices.upload({
      readStream: inputStream,
      mimeType: MimeType.PDF,
    });

    const params = new ExtractPDFParams({
      elementsToExtract: [ExtractElementType.TEXT],
    });

    const job = new ExtractPDFJob({ inputAsset, params });

    const pollingURL = await pdfServices.submit({ job });
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExtractPDFResult,
    });

    const resultAsset = pdfServicesResponse.result.resource;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    // Les ZIP-arkivet som inneholder ekstrahert data
    const zipBuffer = await streamToBuffer(streamAsset.readStream as any);

    // Pakk ut JSON fra ZIP
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipBuffer);
    const jsonEntry = zip.getEntry('structuredData.json');
    
    if (!jsonEntry) {
      throw new Error("Kunne ikke finne ekstrahert data i ZIP");
    }

    const jsonContent = zip.readAsText(jsonEntry);
    const extractedData = JSON.parse(jsonContent);

    // Kombiner all tekst fra elements
    let fullText = "";
    if (extractedData.elements) {
      for (const element of extractedData.elements) {
        if (element.Text) {
          fullText += element.Text + "\n";
        }
      }
    }

    console.log(`Adobe extracted ${fullText.length} characters from PDF`);

    return fullText;

  } catch (error) {
    console.error("Adobe PDF Extract error:", error);
    
    if (error instanceof SDKError || error instanceof ServiceUsageError || error instanceof ServiceApiError) {
      console.error("Adobe API Error:", error.message);
    }
    
    throw error;
  }
}

/**
 * Konverterer HTML-streng til PDF-buffer via Adobe PDF Services REST API.
 * Brukes for inspeksjonsrapporter der innholdet bygges dynamisk server-side.
 */

const ADOBE_REST_API_BASE = "https://pdf-services.adobe.io";
const ADOBE_TOKEN_URL_REST = "https://ims-na1.adobelogin.com/ims/token/v3";

async function getRestAccessToken(): Promise<string> {
  const clientId = process.env.ADOBE_CLIENT_ID;
  const clientSecret = process.env.ADOBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Adobe PDF Services credentials mangler");
  }
  const res = await fetch(ADOBE_TOKEN_URL_REST, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "openid,AdobeID,DCAPI",
    }),
  });
  if (!res.ok) {
    throw new Error(`Adobe token-forespørsel feilet: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

interface HtmlToPdfOptions {
  /** Sideformat: "A4" (standard) eller "letter" */
  pageSize?: "A4" | "letter";
  /** Max ventetid i ms for Adobe-jobben. Default 120 000 ms (2 min). */
  timeoutMs?: number;
}

/**
 * Konverter HTML-streng til PDF via Adobe PDF Services REST API.
 *
 * Robust wrapper med:
 * - Eksponentiell backoff for polling (starter 2s, maks 10s)
 * - Konfigurerbar timeout (default 120s)
 * - Tydelige feilmeldinger for vanlige feilkoder
 * - A4-sideformat som standard
 */
export async function htmlToPdf(htmlContent: string, options: HtmlToPdfOptions = {}): Promise<Buffer> {
  const { pageSize = "A4", timeoutMs = 120_000 } = options;

  const clientId = process.env.ADOBE_CLIENT_ID;
  if (!clientId) throw new Error("ADOBE_CLIENT_ID mangler i .env");

  const token = await getRestAccessToken();

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "x-api-key": clientId,
    "Content-Type": "application/json",
  };

  // Opprett asset-slot
  const assetRes = await fetch(`${ADOBE_REST_API_BASE}/assets`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ mediaType: "text/html" }),
  });
  if (!assetRes.ok) {
    throw new Error(`Adobe: Asset-oppretting feilet med ${assetRes.status} ${assetRes.statusText}`);
  }
  const { uploadUri, assetID } = (await assetRes.json()) as { uploadUri: string; assetID: string };

  // Last opp HTML
  const uploadRes = await fetch(uploadUri, {
    method: "PUT",
    headers: { "Content-Type": "text/html" },
    body: htmlContent,
  });
  if (!uploadRes.ok) {
    throw new Error(`Adobe: HTML-opplasting feilet med ${uploadRes.status} ${uploadRes.statusText}`);
  }

  // Start HTML→PDF-jobb
  // A4: 8.27 × 11.69 tomme. Letter: 8.5 × 11 tomme.
  const pageLayout =
    pageSize === "A4"
      ? { pageWidth: 8.27, pageHeight: 11.69 }
      : { pageWidth: 8.5, pageHeight: 11 };

  const jobRes = await fetch(`${ADOBE_REST_API_BASE}/operation/htmltopdf`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      assetID,
      json: "{}",
      includeHeaderFooter: false,
      pageLayout,
    }),
  });
  if (!jobRes.ok) {
    throw new Error(`Adobe: Jobb-start feilet med ${jobRes.status} ${jobRes.statusText}`);
  }

  const jobUrl = jobRes.headers.get("location");
  if (!jobUrl) throw new Error("Adobe: Ingen jobb-URL i responsen");

  // Poll med eksponentiell backoff til done/failed/timeout
  const deadline = Date.now() + timeoutMs;
  let delay = 2_000;
  let downloadUri: string | null = null;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 10_000);

    const statusRes = await fetch(jobUrl, {
      headers: { Authorization: `Bearer ${token}`, "x-api-key": clientId },
    });
    if (!statusRes.ok) continue;

    const statusData = (await statusRes.json()) as {
      status: string;
      asset?: { downloadUri?: string };
      error?: unknown;
    };

    if (statusData.status === "done") {
      downloadUri = statusData.asset?.downloadUri ?? null;
      break;
    }

    if (statusData.status === "failed") {
      throw new Error(`Adobe: PDF-konvertering feilet: ${JSON.stringify(statusData.error)}`);
    }
  }

  if (!downloadUri) {
    throw new Error(`Adobe: PDF-generering tidsavbrutt etter ${timeoutMs / 1000}s`);
  }

  const pdfRes = await fetch(downloadUri);
  if (!pdfRes.ok) {
    throw new Error(`Adobe: PDF-nedlasting feilet med ${pdfRes.status} ${pdfRes.statusText}`);
  }

  return Buffer.from(await pdfRes.arrayBuffer());
}
