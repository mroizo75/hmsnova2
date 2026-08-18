/**
 * DOCX Generator for HMS Nova
 * 
 * Genererer profesjonelle Word-dokumenter (.docx) som følger ISO 9001-standarden.
 * Dokumentene er fullt editerbare og tilpassbare for hver bedrift.
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  VerticalAlign,
  ShadingType,
  convertInchesToTwip,
  Packer,
  Header,
  Footer,
  ImageRun,
  PageNumber,
  NumberFormat,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// ==================== TYPES ====================

interface DocumentMetadata {
  documentNumber: string;
  title: string;
  version: string;
  date: string;
  preparedBy: string;
  approvedBy: string;
  revisionFrequency: string;
}

interface GeneratorData {
  id: string;
  companyName: string;
  orgNumber: string | null;
  industry: string;
  employees: number;  // Number of employees (matches Prisma)
  ceoName: string;    // CEO name from Prisma
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  
  // Step 2
  risks?: string[];
  hasChemicals?: boolean;
  hasHeavyLifting?: boolean;
  hasHeightWork?: boolean;
  
  // Step 3
  hmsResponsible?: string | null;
  hmsEmail?: string | null;
  hmsPhone?: string | null;
  hasSafetyRep?: boolean;
  safetyRep?: string | null;
  safetyRepEmail?: string | null;
  safetyRepPhone?: string | null;
  hasBHT?: boolean;
  bhtProvider?: string | null;
  bhtContact?: string | null;
  
  // Step 4
  completedTraining?: any;  // JSON from Prisma
  
  // Step 5
  hmsPolicy?: string;
  specificGoals?: string;
}

// ==================== STYLING ====================

const HMS_PRIMARY = "16a34a"; // HMS Nova grønn (fra brand)
const HMS_SECONDARY = "15803d"; // Mørkere grønn
const HMS_DARK = "0f172a"; // Header navy
const HMS_GRAY = "64748b";
const HMS_LIGHT_GRAY = "f8fafc";

// ==================== LOGO ====================

let _logoBuffer: Buffer | null = null;

function getLogoBuffer(): Buffer | null {
  if (_logoBuffer !== null) return _logoBuffer;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-nova.png");
    if (fs.existsSync(logoPath)) {
      _logoBuffer = fs.readFileSync(logoPath);
    } else {
      _logoBuffer = null;
    }
  } catch {
    _logoBuffer = null;
  }
  return _logoBuffer;
}

function createDocxHeader(companyName: string): Header {
  const logoBuffer = getLogoBuffer();
  const children: Paragraph[] = [];

  if (logoBuffer) {
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 90, height: 24 },
            type: "png",
          }),
          new TextRun({
            text: `   ${companyName}`,
            size: 18,
            color: HMS_GRAY,
          }),
        ],
        spacing: { after: 80 },
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "HMS Nova", bold: true, color: HMS_PRIMARY, size: 20 }),
          new TextRun({ text: `   ${companyName}`, size: 18, color: HMS_GRAY }),
        ],
        spacing: { after: 80 },
      })
    );
  }

  return new Header({ children });
}

function createDocxFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "HMS Nova  ·  hmsnova.no  ·  Side ", size: 16, color: HMS_GRAY }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 16,
            color: HMS_GRAY,
          }),
          new TextRun({ text: " av ", size: 16, color: HMS_GRAY }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 16,
            color: HMS_GRAY,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
      }),
    ],
  });
}

// ==================== HELPER FUNCTIONS ====================

function createHeader(text: string, level = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
    style: level === HeadingLevel.HEADING_1 ? "Heading1" : "Heading2",
  });
}

function createSubHeader(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function createParagraph(text: string, options: { bold?: boolean; italic?: boolean; color?: string } = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italic,
        color: options.color,
      }),
    ],
    spacing: { before: 100, after: 100 },
  });
}

function createBulletPoint(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { before: 50, after: 50 },
  });
}

function createMetadataTable(metadata: DocumentMetadata): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
    },
    rows: [
      createTableRow("Dokumentnummer:", metadata.documentNumber, true),
      createTableRow("Versjon:", metadata.version),
      createTableRow("Dato:", metadata.date),
      createTableRow("Utarbeidet av:", metadata.preparedBy),
      createTableRow("Godkjent av:", metadata.approvedBy),
      createTableRow("Revisjonsfrekvens:", metadata.revisionFrequency),
    ],
  });
}

function createTableRow(label: string, value: string, header: boolean = false): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, color: HMS_DARK })],
          }),
        ],
        shading: header ? { fill: HMS_LIGHT_GRAY, type: ShadingType.CLEAR } : undefined,
        width: { size: 35, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: value, color: HMS_DARK })],
          }),
        ],
        width: { size: 65, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
      }),
    ],
  });
}

function createResponsibilityTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: "Rolle", alignment: AlignmentType.CENTER })],
            shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
            width: { size: 30, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ text: "Ansvar", alignment: AlignmentType.CENTER })],
            shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
            width: { size: 70, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      createResponsibilityRow("Daglig leder", "Overordnet ansvar for HMS-arbeidet, oppfølging av mål, risikovurdering og årlig revisjon."),
      createResponsibilityRow("Verneombud", "Representerer arbeidstakere i HMS-spørsmål, melder avvik og foreslår forbedringer."),
      createResponsibilityRow("Ledere / Formenn", "Sikrer at HMS-rutiner følges i praksis og at avvik registreres."),
      createResponsibilityRow("Arbeidstakere", "Skal delta aktivt i HMS-arbeidet, følge prosedyrer og melde fra om farlige forhold."),
      createResponsibilityRow("AMU", "Gjennomgår ulykker, avvik, og foreslår tiltak for forbedring."),
    ],
  });
}

function createResponsibilityRow(role: string, responsibility: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ text: role })],
        verticalAlign: VerticalAlign.CENTER,
      }),
      new TableCell({
        children: [new Paragraph({ text: responsibility })],
        verticalAlign: VerticalAlign.CENTER,
      }),
    ],
  });
}

// ==================== DOCUMENT GENERATORS ====================

/**
 * HMS-00: Register over HMS-dokumenter
 */
export async function generateDocumentRegister(data: GeneratorData): Promise<Buffer> {
  const today = new Date().toLocaleDateString("no-NO");
  
  const doc = new Document({
    sections: [
      {
        properties: { page: { pageNumbers: { formatType: NumberFormat.DECIMAL } } },
        headers: { default: createDocxHeader(data.companyName) },
        footers: { default: createDocxFooter() },
        children: [
          // Title
          new Paragraph({
            text: "📘 REGISTER OVER HMS-DOKUMENTER",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
          }),
          
          // Metadata
          createMetadataTable({
            documentNumber: "HMS-00",
            title: "Register over HMS-dokumenter",
            version: "1.0",
            date: today,
            preparedBy: data.hmsResponsible || data.ceoName,
            approvedBy: data.hmsResponsible === data.ceoName || !data.hmsResponsible ? data.ceoName : "Daglig leder",
            revisionFrequency: "Årlig / ved endringer i systemet",
          }),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          // 1. Formål
          createHeader("1. Formål", HeadingLevel.HEADING_1),
          createParagraph(
            "Dette dokumentet gir oversikt over alle gjeldende HMS-dokumenter, prosedyrer og maler i virksomhetens kvalitetssystem. Hensikten er å sikre at dokumentene er:"
          ),
          createBulletPoint("Oppdaterte og sporbare"),
          createBulletPoint("Enhetlige i struktur og nummerering"),
          createBulletPoint("Lett tilgjengelige for ansatte, ledelse og tilsynsmyndigheter"),
          
          // 2. Omfang
          createHeader("2. Omfang", HeadingLevel.HEADING_1),
          createParagraph(
            `Registeret gjelder for alle HMS- og kvalitetssystemdokumenter hos ${data.companyName}. Dokumentene skal være lagret digitalt i HMS Nova og kun tilgjengelig i siste godkjente versjon.`
          ),
          
          // 3. Ansvar
          createHeader("3. Ansvar", HeadingLevel.HEADING_1),
          createParagraph("Daglig leder: Har det overordnede ansvaret for at dokumentstyringen fungerer.", { bold: true }),
          createParagraph(`HMS-ansvarlig (${data.hmsResponsible}): Har ansvar for oppdatering av registeret, revisjoner og arkivering.`, { bold: true }),
          createParagraph("Alle ansatte: Skal bruke og forholde seg til gjeldende versjon av dokumentene."),
          
          // 4. Dokumentstruktur
          createHeader("4. Dokumentstruktur", HeadingLevel.HEADING_1),
          createSubHeader("4.1 Nummereringssystem"),
          createParagraph("Alle dokumenter får et unikt dokumentnummer etter følgende struktur:"),
          createParagraph("HMS-XX", { bold: true }),
          createBulletPoint("HMS står for Helse, Miljø og Sikkerhet"),
          createBulletPoint("XX angir dokumentets kategori eller rekkefølge"),
          
          // 5. Oversikt over HMS-dokumenter
          createHeader("5. Oversikt over HMS-dokumenter", HeadingLevel.HEADING_1),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Dokumentnummer", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ text: "Dokumentnavn", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ text: "Versjon", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ text: "Dato", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ text: "Ansvarlig", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("HMS-00")] }),
                  new TableCell({ children: [new Paragraph("Register over HMS-dokumenter")] }),
                  new TableCell({ children: [new Paragraph("1.0")] }),
                  new TableCell({ children: [new Paragraph(today)] }),
                  new TableCell({ children: [new Paragraph(data.hmsResponsible || data.ceoName)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("HMS-01")] }),
                  new TableCell({ children: [new Paragraph("Hoveddokument for HMS-system")] }),
                  new TableCell({ children: [new Paragraph("1.0")] }),
                  new TableCell({ children: [new Paragraph(today)] }),
                  new TableCell({ children: [new Paragraph("Daglig leder")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("HMS-02")] }),
                  new TableCell({ children: [new Paragraph("Risikovurderingsmal")] }),
                  new TableCell({ children: [new Paragraph("1.0")] }),
                  new TableCell({ children: [new Paragraph(today)] }),
                  new TableCell({ children: [new Paragraph(data.hmsResponsible || data.ceoName)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("HMS-03")] }),
                  new TableCell({ children: [new Paragraph("Opplæringsplan")] }),
                  new TableCell({ children: [new Paragraph("1.0")] }),
                  new TableCell({ children: [new Paragraph(today)] }),
                  new TableCell({ children: [new Paragraph(data.hmsResponsible || data.ceoName)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("HMS-04")] }),
                  new TableCell({ children: [new Paragraph("Vernerunde / Sjekkliste")] }),
                  new TableCell({ children: [new Paragraph("1.0")] }),
                  new TableCell({ children: [new Paragraph(today)] }),
                  new TableCell({ children: [new Paragraph(data.safetyRep || "Verneombud")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("HMS-05")] }),
                  new TableCell({ children: [new Paragraph("AMU møteprotokoll")] }),
                  new TableCell({ children: [new Paragraph("1.0")] }),
                  new TableCell({ children: [new Paragraph(today)] }),
                  new TableCell({ children: [new Paragraph("AMU-leder")] }),
                ],
              }),
            ],
          }),
          
          // 6. Dokumentstyring
          createHeader("6. Dokumentstyring", HeadingLevel.HEADING_1),
          createBulletPoint("Nye dokumenter skal godkjennes av daglig leder før publisering"),
          createBulletPoint("Tidligere versjoner arkiveres i HMS Nova"),
          createBulletPoint("Alle oppdateringer skal føres i revisjonstabellen"),
          createBulletPoint("Bare godkjent versjon skal være tilgjengelig for ansatte"),
          
          // 7. Referanser
          createHeader("7. Referanser", HeadingLevel.HEADING_1),
          createBulletPoint("ISO 9001:2015 – Kap. 7.5 (Dokumentert informasjon)"),
          createBulletPoint("Internkontrollforskriften § 5, punkt 1–8"),
          createBulletPoint("Arbeidsmiljøloven § 3-1"),
          
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokumentet er generert av HMS Nova for ${data.companyName}`,
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });
  
  // Convert to buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

/**
 * HMS-01: Hoveddokument for HMS-system (HMS-Håndbok)
 */
export async function generateHMSHandbook(data: GeneratorData): Promise<Buffer> {
  const today = new Date().toLocaleDateString("no-NO");
  
  const doc = new Document({
    sections: [
      {
        properties: { page: { pageNumbers: { formatType: NumberFormat.DECIMAL } } },
        headers: { default: createDocxHeader(data.companyName) },
        footers: { default: createDocxFooter() },
        children: [
          // Title
          new Paragraph({
            text: "📘 HOVEDDOKUMENT FOR HMS-SYSTEM",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
          }),
          
          new Paragraph({
            text: data.companyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
          }),
          
          // Metadata
          createMetadataTable({
            documentNumber: "HMS-01",
            title: "Hoveddokument for HMS-system",
            version: "1.0",
            date: today,
            preparedBy: data.hmsResponsible || data.ceoName,
            approvedBy: data.hmsResponsible === data.ceoName || !data.hmsResponsible ? data.ceoName : "Daglig leder",
            revisionFrequency: "Årlig / ved endring",
          }),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          // 1. Formål
          createHeader("1. Formål", HeadingLevel.HEADING_1),
          createParagraph(
            `Formålet med dette dokumentet er å beskrive hvordan ${data.companyName} arbeider systematisk for å ivareta helse, miljø og sikkerhet (HMS) i tråd med gjeldende lover og standarder.`
          ),
          createParagraph("Dokumentet skal danne grunnlaget for bedriftens HMS-system og sikre at arbeidet følger kravene i:"),
          createBulletPoint("Internkontrollforskriften §5"),
          createBulletPoint("Arbeidsmiljøloven kap. 2 og 3"),
          createBulletPoint("ISO 9001:2015 kapittel 4–10"),
          
          // 2. Omfang
          createHeader("2. Omfang", HeadingLevel.HEADING_1),
          createParagraph("Systemet gjelder for alle deler av virksomheten, inkludert:"),
          createBulletPoint("Kontor- og administrativt arbeid"),
          createBulletPoint(`${data.industry} (hovedvirksomhet)`),
          createBulletPoint("Innleide og eksterne leverandører"),
          createBulletPoint("Midlertidig arbeid, kurs og prosjekter"),
          
          // 3. Ansvar og roller
          createHeader("3. Ansvar og roller", HeadingLevel.HEADING_1),
          createResponsibilityTable(),
          
          new Paragraph({ text: "", spacing: { before: 200 } }),
          createSubHeader("HMS-organisering i virksomheten:"),
          createParagraph(`HMS-ansvarlig: ${data.hmsResponsible}`, { bold: true }),
          ...(data.hmsEmail ? [createParagraph(`E-post: ${data.hmsEmail}`)] : []),
          ...(data.hmsPhone ? [createParagraph(`Telefon: ${data.hmsPhone}`)] : []),
          
          ...(data.hasSafetyRep && data.safetyRep
            ? [
                new Paragraph({ text: "", spacing: { before: 100 } }),
                createParagraph(`Verneombud: ${data.safetyRep}`, { bold: true }),
                ...(data.safetyRepEmail ? [createParagraph(`E-post: ${data.safetyRepEmail}`)] : []),
                ...(data.safetyRepPhone ? [createParagraph(`Telefon: ${data.safetyRepPhone}`)] : []),
              ]
            : []),
          
          ...(data.hasBHT && data.bhtProvider
            ? [
                new Paragraph({ text: "", spacing: { before: 100 } }),
                createParagraph(`Bedriftshelsetjeneste: ${data.bhtProvider}`, { bold: true }),
                ...(data.bhtContact ? [createParagraph(`Kontaktperson: ${data.bhtContact}`)] : []),
              ]
            : []),
          
          // 4. Målsettinger
          createHeader("4. Målsettinger", HeadingLevel.HEADING_1),
          createParagraph(`${data.companyName} skal:`),
          createBulletPoint("Ha null skader og ulykker"),
          createBulletPoint("Ha et godt og inkluderende arbeidsmiljø"),
          createBulletPoint("Sikre systematisk risikostyring og oppfølging av tiltak"),
          createBulletPoint("Sørge for nødvendig opplæring i HMS og beredskap"),
          createBulletPoint("Sikre kontinuerlig forbedring gjennom avvikshåndtering og revisjoner"),
          
          ...(data.specificGoals
            ? [
                new Paragraph({ text: "", spacing: { before: 100 } }),
                createSubHeader("Spesifikke mål for virksomheten:"),
                createParagraph(data.specificGoals),
              ]
            : []),
          
          // 5. HMS-politikk
          createHeader("5. HMS-politikk", HeadingLevel.HEADING_1),
          createParagraph(
            data.hmsPolicy ||
              `«${data.companyName} skal være en trygg og bærekraftig arbeidsplass der alle tar ansvar for helse, miljø og sikkerhet. HMS er en integrert del av våre daglige aktiviteter og grunnlaget for kvalitet i alt vi gjør.»`,
            { italic: true }
          ),
          
          // 6. Risikovurdering
          createHeader("6. Risikovurdering", HeadingLevel.HEADING_1),
          createParagraph(
            `${data.companyName} har identifisert følgende hovedrisikoer i virksomheten:`
          ),
          
          ...(data.risks && data.risks.length > 0
            ? data.risks.map((risk) => createBulletPoint(risk))
            : [createBulletPoint("Generelle kontorrisiker (ergonomi, arbeidsstillinger)")]),
          
          ...(data.hasChemicals ? [createBulletPoint("Kjemikaliehåndtering")] : []),
          ...(data.hasHeavyLifting ? [createBulletPoint("Tunge løft og ergonomi")] : []),
          ...(data.hasHeightWork ? [createBulletPoint("Arbeid i høyden")] : []),
          
          new Paragraph({ text: "", spacing: { before: 100 } }),
          createParagraph("Detaljert risikovurdering finnes i dokument HMS-02."),
          
          // 7. Opplæring og kompetanse
          createHeader("7. Opplæring og kompetanse", HeadingLevel.HEADING_1),
          createParagraph("Alle ansatte skal ha nødvendig opplæring for å utføre sine arbeidsoppgaver trygt."),
          
          ...(data.completedTraining && Array.isArray(data.completedTraining) && data.completedTraining.length > 0
            ? [
                new Paragraph({ text: "", spacing: { before: 100 } }),
                createSubHeader("Gjennomført opplæring:"),
                ...(data.completedTraining as string[]).map((training) => createBulletPoint(training)),
              ]
            : []),
          
          new Paragraph({ text: "", spacing: { before: 100 } }),
          createParagraph("Fullstendig opplæringsplan finnes i dokument HMS-03."),
          
          // 8. Arbeidsmetodikk (PDCA)
          createHeader("8. Arbeidsmetodikk (Plan-Do-Check-Act)", HeadingLevel.HEADING_1),
          createParagraph("Systemet bygger på kontinuerlig forbedring etter PDCA-modellen:"),
          createBulletPoint("Plan: Kartlegg risiko, definer mål og rutiner"),
          createBulletPoint("Do: Gjennomfør planlagte tiltak og opplæring"),
          createBulletPoint("Check: Gjennomfør kontroller, vernerunder og revisjoner"),
          createBulletPoint("Act: Iverksett forbedringer og oppdater dokumentasjon"),
          
          // 9. Avvik og forbedringsarbeid
          createHeader("9. Avvik og forbedringsarbeid", HeadingLevel.HEADING_1),
          createParagraph("Alle ansatte skal kunne melde avvik via HMS Nova eller bedriftens avviksskjema."),
          createParagraph("Avvik loggføres, vurderes og følges opp av daglig leder og verneombud."),
          createParagraph("Tiltak dokumenteres, og erfaringer brukes i neste revisjon."),
          
          // 10. Revisjon og oppfølging
          createHeader("10. Revisjon og oppfølging", HeadingLevel.HEADING_1),
          createParagraph("HMS-systemet skal gjennomgås minst én gang i året."),
          createParagraph("Resultater, avvik og forbedringstiltak behandles i AMU-møte og ledelsens gjennomgang."),
          createParagraph("Dokumentasjonen skal være tilgjengelig digitalt i HMS Nova."),
          
          // 11. Referanser
          createHeader("11. Referanser", HeadingLevel.HEADING_1),
          createBulletPoint("ISO 9001:2015 – Kvalitetsstyringssystemer"),
          createBulletPoint("Arbeidsmiljøloven (LOV-2005-06-17-62)"),
          createBulletPoint("Forskrift om systematisk HMS-arbeid (FOR-1996-12-06-1127)"),
          createBulletPoint("Forskrift om organisering, ledelse og medvirkning"),
          createBulletPoint("Forskrift om utførelse av arbeid"),
          createBulletPoint("Internkontrollforskriften §5"),
          
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokumentet er generert av HMS Nova for ${data.companyName}`,
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Rediger og tilpass dokumentet etter dine behov",
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });
  
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

/**
 * HMS-02: Risikovurdering
 */
export async function generateRiskAssessment(data: GeneratorData): Promise<Buffer> {
  const today = new Date().toLocaleDateString("no-NO");
  
  const doc = new Document({
    sections: [
      {
        properties: { page: { pageNumbers: { formatType: NumberFormat.DECIMAL } } },
        headers: { default: createDocxHeader(data.companyName) },
        footers: { default: createDocxFooter() },
        children: [
          // Title
          new Paragraph({
            text: "📘 RISIKOVURDERING",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
          }),
          
          new Paragraph({
            text: data.companyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
          }),
          
          // Metadata
          createMetadataTable({
            documentNumber: "HMS-02",
            title: "Risikovurdering",
            version: "1.0",
            date: today,
            preparedBy: data.hmsResponsible || data.ceoName,
            approvedBy: "Daglig leder",
            revisionFrequency: "Årlig / ved endring i prosess, arbeidsutstyr eller lokaler",
          }),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          // 1. Formål
          createHeader("1. Formål", HeadingLevel.HEADING_1),
          createParagraph(
            "Formålet er å sikre at virksomheten systematisk kartlegger og vurderer risiko for skade på mennesker, miljø og materiell. Resultatet skal brukes til å forebygge ulykker, helseskader og driftsavbrudd, og bidra til kontinuerlig forbedring av HMS-arbeidet."
          ),
          
          // 2. Omfang
          createHeader("2. Omfang", HeadingLevel.HEADING_1),
          createParagraph(
            `Denne prosedyren gjelder alle arbeidsoperasjoner, prosjekter og aktiviteter hos ${data.companyName} hvor ansatte, leverandører eller andre kan bli eksponert for fare.`
          ),
          createParagraph("Gjelder både faste og midlertidige arbeidsplasser."),
          
          // 3. Ansvar og roller
          createHeader("3. Ansvar og roller", HeadingLevel.HEADING_1),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Rolle", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Ansvar", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 70, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              createResponsibilityRow("Daglig leder", "Overordnet ansvar for at risikovurderinger gjennomføres, dokumenteres og oppdateres."),
              createResponsibilityRow("Avdelingsleder / Formann", "Utfører risikovurderinger i sitt ansvarsområde og følger opp tiltak."),
              createResponsibilityRow(data.safetyRep || "Verneombud", "Skal delta i risikovurderinger og påse at arbeidstakernes erfaringer blir tatt med."),
              createResponsibilityRow("Arbeidstakere", "Plikter å bidra med informasjon om farlige forhold og delta i kartlegging."),
            ],
          }),
          
          // 4. Fremgangsmåte
          createHeader("4. Fremgangsmåte", HeadingLevel.HEADING_1),
          createSubHeader("4.1 Kartlegging av farer"),
          createBulletPoint("Identifiser arbeidsoppgaver og prosesser"),
          createBulletPoint("Beskriv mulige farer (fysiske, kjemiske, ergonomiske, psykososiale, organisatoriske)"),
          createBulletPoint("Registrer alle observasjoner i risikovurderingsskjemaet"),
          
          createSubHeader("4.2 Vurdering av risiko"),
          createParagraph("Risiko vurderes ut fra sannsynlighet (S) og konsekvens (K) etter følgende matrise:"),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Risiko", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ text: "Sannsynlighet", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ text: "Konsekvens", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                  new TableCell({ children: [new Paragraph({ text: "Risikonivå = S × K", alignment: AlignmentType.CENTER })], shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR } }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Lav (1–3)")] }),
                  new TableCell({ children: [new Paragraph("Lite sannsynlig")] }),
                  new TableCell({ children: [new Paragraph("Ubetydelig skade")] }),
                  new TableCell({ children: [new Paragraph("Akseptabel risiko")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Middels (4–6)")] }),
                  new TableCell({ children: [new Paragraph("Sannsynlig")] }),
                  new TableCell({ children: [new Paragraph("Alvorlig skade")] }),
                  new TableCell({ children: [new Paragraph("Tiltak bør iverksettes")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Høy (8–12)")] }),
                  new TableCell({ children: [new Paragraph("Svært sannsynlig")] }),
                  new TableCell({ children: [new Paragraph("Kritisk skade / dødsfall")] }),
                  new TableCell({ children: [new Paragraph("Umiddelbare tiltak nødvendig")] }),
                ],
              }),
            ],
          }),
          
          new Paragraph({ text: "", spacing: { before: 100 } }),
          createParagraph("Skala kan tilpasses virksomheten (1–4 eller 1–5)."),
          
          createSubHeader("4.3 Tiltak"),
          createBulletPoint("Beskriv planlagte forebyggende og korrigerende tiltak"),
          createBulletPoint("Angi ansvarlig person og frist for gjennomføring"),
          createBulletPoint("Etter gjennomføring skal tiltak evalueres og dokumenteres"),
          
          // 5. Identifiserte risikoer
          createHeader("5. Identifiserte risikoer for virksomheten", HeadingLevel.HEADING_1),
          createParagraph(`${data.companyName} har identifisert følgende hovedrisikoer:`),
          
          ...(data.risks && data.risks.length > 0
            ? data.risks.map((risk) => createBulletPoint(risk))
            : [createBulletPoint("Generelle kontorrisiker (ergonomi, arbeidsstillinger)")]),
          
          ...(data.hasChemicals ? [createBulletPoint("Kjemikaliehåndtering og eksponering")] : []),
          ...(data.hasHeavyLifting ? [createBulletPoint("Tunge løft og belastningsskader")] : []),
          ...(data.hasHeightWork ? [createBulletPoint("Arbeid i høyden og fallrisiko")] : []),
          
          new Paragraph({ text: "", spacing: { before: 200 } }),
          createParagraph("Bruk HMS Nova systemet for å registrere, vurdere og følge opp risikoer digitalt.", { italic: true }),
          
          // 6. Oppfølging og revisjon
          createHeader("6. Oppfølging og revisjon", HeadingLevel.HEADING_1),
          createBulletPoint("Risikovurderinger gjennomgås årlig eller ved endringer i arbeidsforhold, utstyr eller ulykker"),
          createBulletPoint("Tiltak evalueres og oppdateres i HMS Nova"),
          createBulletPoint("Nye eller endrede farer skal registreres umiddelbart"),
          
          // 7. Dokumentasjon og lagring
          createHeader("7. Dokumentasjon og lagring", HeadingLevel.HEADING_1),
          createBulletPoint("Utfylte risikovurderinger skal lagres digitalt under mappen 'Risikovurderinger'"),
          createBulletPoint("Dokumentene skal være tilgjengelig for alle ansatte, AMU og verneombud"),
          
          // 8. Referanser
          createHeader("8. Referanser", HeadingLevel.HEADING_1),
          createBulletPoint("ISO 9001:2015 kap. 6.1 – Tiltak for risiko og muligheter"),
          createBulletPoint("Internkontrollforskriften §5"),
          createBulletPoint("Arbeidsmiljøloven §§ 3-1 og 4-1"),
          createBulletPoint("Forskrift om utførelse av arbeid"),
          createBulletPoint("Arbeidstilsynets veiledning: \"Risikovurdering – hvordan gjøre det i praksis\""),
          
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokumentet er generert av HMS Nova for ${data.companyName}`,
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Rediger og tilpass dokumentet etter dine behov",
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });
  
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

/**
 * HMS-03: Opplæringsplan
 */
export async function generateTrainingPlan(data: GeneratorData): Promise<Buffer> {
  const today = new Date().toLocaleDateString("no-NO");
  
  const doc = new Document({
    sections: [
      {
        properties: { page: { pageNumbers: { formatType: NumberFormat.DECIMAL } } },
        headers: { default: createDocxHeader(data.companyName) },
        footers: { default: createDocxFooter() },
        children: [
          // Title
          new Paragraph({
            text: "📘 OPPLÆRINGSPLAN",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
          }),
          
          new Paragraph({
            text: data.companyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
          }),
          
          // Metadata
          createMetadataTable({
            documentNumber: "HMS-03",
            title: "Opplæringsplan",
            version: "1.0",
            date: today,
            preparedBy: data.hmsResponsible || data.ceoName,
            approvedBy: "Daglig leder",
            revisionFrequency: "Årlig / ved endringer i roller, utstyr eller regelverk",
          }),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          // 1. Formål
          createHeader("1. Formål", HeadingLevel.HEADING_1),
          createParagraph(
            `Formålet er å sikre at alle ansatte, innleide og ledere hos ${data.companyName} har tilstrekkelig og dokumentert kompetanse til å utføre sine arbeidsoppgaver trygt og i samsvar med lovpålagte krav.`
          ),
          createParagraph("Planen skal bidra til kontinuerlig utvikling av HMS-kompetanse og kvalitet i tjenestene."),
          
          // 2. Omfang
          createHeader("2. Omfang", HeadingLevel.HEADING_1),
          createParagraph("Planen gjelder alle stillinger i virksomheten og omfatter:"),
          createBulletPoint("HMS-opplæring for arbeidsgiver, ledere og verneombud"),
          createBulletPoint("Fag- og sikkerhetsopplæring (for eksempel maskinfører-, truck-, eller arbeid-i-høyden-kurs)"),
          createBulletPoint("Intern opplæring i rutiner, beredskap og førstehjelp"),
          createBulletPoint("Re-sertifiseringer og oppfriskningskurs"),
          
          // 3. Ansvar og roller
          createHeader("3. Ansvar og roller", HeadingLevel.HEADING_1),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Rolle", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Ansvar", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 70, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              createResponsibilityRow("Daglig leder", "Overordnet ansvar for at alle ansatte har nødvendig kompetanse og at opplæring dokumenteres."),
              createResponsibilityRow("Avdelingsleder / Formann", "Planlegger og følger opp opplæring i sin avdeling."),
              createResponsibilityRow(data.hmsResponsible || "HMS-ansvarlig", "Oppdaterer opplæringsplanen og sørger for registrering i HMS Nova."),
              createResponsibilityRow("Arbeidstakere", "Skal delta i planlagt opplæring og følge opp krav til kompetanse."),
            ],
          }),
          
          // 4. Fremgangsmåte
          createHeader("4. Fremgangsmåte", HeadingLevel.HEADING_1),
          
          createSubHeader("4.1 Kartlegging av kompetansebehov"),
          createBulletPoint("Vurder hvilke roller som finnes i virksomheten"),
          createBulletPoint("Definer nødvendig kompetanse og lovpålagte krav for hver rolle"),
          createBulletPoint("Kartlegg nåværende kompetanse (sertifikater, kurs, erfaring)"),
          createBulletPoint("Identifiser gap og planlegg nødvendige kurs eller opplæringstiltak"),
          
          createSubHeader("4.2 Gjennomføring"),
          createBulletPoint("Opplæring gjennomføres etter plan og dokumenteres fortløpende"),
          createBulletPoint("Kursbevis og sertifikater lagres digitalt i bedriftens system"),
          createBulletPoint("For nyansatte skal HMS-opplæring gjennomføres før oppstart"),
          
          createSubHeader("4.3 Evaluering"),
          createBulletPoint("Effekt av opplæring vurderes i medarbeidersamtaler, vernerunder eller interne revisjoner"),
          createBulletPoint("Manglende kompetanse følges opp med nye tiltak"),
          
          // 5. Gjennomført opplæring
          ...(data.completedTraining && Array.isArray(data.completedTraining) && data.completedTraining.length > 0
            ? [
                createHeader("5. Gjennomført opplæring", HeadingLevel.HEADING_1),
                createParagraph("Følgende opplæring er registrert som gjennomført:"),
                ...(data.completedTraining as string[]).map((training) => createBulletPoint(training)),
                new Paragraph({ text: "", spacing: { before: 200 } }),
                createParagraph("Bruk HMS Nova for å registrere og dokumentere all opplæring.", { italic: true }),
              ]
            : [
                createHeader("5. Opplæringsplan", HeadingLevel.HEADING_1),
                createParagraph("Bruk HMS Nova for å opprette og administrere opplæringsplaner digitalt."),
                createParagraph("Systemet hjelper deg med å:"),
                createBulletPoint("Kartlegge kompetansebehov"),
                createBulletPoint("Planlegge nødvendig opplæring"),
                createBulletPoint("Dokumentere gjennomført opplæring"),
                createBulletPoint("Holde oversikt over sertifikater og gyldighet"),
              ]),
          
          // 6. Oppfølging og revisjon
          createHeader("6. Oppfølging og revisjon", HeadingLevel.HEADING_1),
          createBulletPoint("Opplæringsplanen revideres årlig og ved endring av stilling eller arbeidsoppgaver"),
          createBulletPoint("Nye kursbehov vurderes i AMU-møter eller ledelsens gjennomgang"),
          createBulletPoint("Planen skal være tilgjengelig for ansatte og kontrollmyndigheter"),
          
          // 7. Referanser
          createHeader("7. Referanser", HeadingLevel.HEADING_1),
          createBulletPoint("ISO 9001:2015 – pkt. 7.2 Kompetanse"),
          createBulletPoint("Arbeidsmiljøloven § 3-2"),
          createBulletPoint("Forskrift om organisering, ledelse og medvirkning kap. 3"),
          createBulletPoint("Internkontrollforskriften § 5"),
          createBulletPoint("Arbeidstilsynet: Veiledning «HMS-opplæring for ledere og verneombud»"),
          
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokumentet er generert av HMS Nova for ${data.companyName}`,
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Rediger og tilpass dokumentet etter dine behov",
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });
  
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

/**
 * HMS-04: Vernerunde / Sjekkliste
 */
export async function generateSafetyRound(data: GeneratorData): Promise<Buffer> {
  const today = new Date().toLocaleDateString("no-NO");
  
  const doc = new Document({
    sections: [
      {
        properties: { page: { pageNumbers: { formatType: NumberFormat.DECIMAL } } },
        headers: { default: createDocxHeader(data.companyName) },
        footers: { default: createDocxFooter() },
        children: [
          // Title
          new Paragraph({
            text: "📘 VERNERUNDE / SJEKKLISTE",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
          }),
          
          new Paragraph({
            text: data.companyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
          }),
          
          // Metadata
          createMetadataTable({
            documentNumber: "HMS-04",
            title: "Vernerunde / Sjekkliste",
            version: "1.0",
            date: today,
            preparedBy: data.safetyRep || data.hmsResponsible || data.ceoName,
            approvedBy: "Daglig leder",
            revisionFrequency: "Minimum én gang per år eller ved endringer i arbeidsforhold",
          }),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          // 1. Formål
          createHeader("1. Formål", HeadingLevel.HEADING_1),
          createParagraph(`Formålet er å sikre at ${data.companyName} gjennomfører regelmessige vernerunder for å:`),
          createBulletPoint("Avdekke farlige forhold, mangler og avvik i arbeidsmiljøet"),
          createBulletPoint("Forebygge ulykker og helseskader"),
          createBulletPoint("Følge opp tidligere avvik og tiltak"),
          createBulletPoint("Skape dialog mellom ledelse og ansatte om HMS"),
          
          // 2. Omfang
          createHeader("2. Omfang", HeadingLevel.HEADING_1),
          createParagraph("Vernerunden skal omfatte alle arbeidsområder, inkludert kontor, lager, verksted, byggeplass og uteområder."),
          createParagraph("Ved større virksomheter gjennomføres egne vernerunder per avdeling."),
          
          // 3. Ansvar og roller
          createHeader("3. Ansvar og roller", HeadingLevel.HEADING_1),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Rolle", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Ansvar", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 70, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              createResponsibilityRow("Daglig leder", "Har det overordnede ansvaret for at vernerunder gjennomføres."),
              createResponsibilityRow(data.safetyRep || "Verneombud", "Leder vernerunden og sikrer at arbeidstakernes synspunkter blir tatt med."),
              createResponsibilityRow("Avdelingsleder / Formann", "Følger opp tiltak og rapporterer status."),
              createResponsibilityRow("Arbeidstakere", "Skal delta aktivt og melde fra om observasjoner."),
            ],
          }),
          
          // 4. Fremgangsmåte
          createHeader("4. Fremgangsmåte", HeadingLevel.HEADING_1),
          
          createSubHeader("4.1 Forberedelser"),
          createBulletPoint("Sett tidspunkt og informer ansatte om vernerunden"),
          createBulletPoint("Ta med tidligere vernerapporter for å følge opp tidligere avvik"),
          createBulletPoint("Bruk sjekklisten under som utgangspunkt for observasjonene"),
          
          createSubHeader("4.2 Gjennomføring"),
          createBulletPoint("Vernerunden skal dekke fysiske forhold, utstyr, arbeidsrutiner og psykososiale forhold"),
          createBulletPoint("Funn og observasjoner dokumenteres i skjemaet"),
          createBulletPoint("Hvert funn vurderes etter alvorlighetsgrad og får et ansvarlig navn og frist"),
          
          createSubHeader("4.3 Oppfølging"),
          createBulletPoint("Alle funn og tiltak skal registreres i HMS-systemet"),
          createBulletPoint("Daglig leder og verneombud gjennomgår status i neste AMU-møte"),
          createBulletPoint("Tiltak evalueres ved neste vernerunde"),
          
          // 5. Sjekkliste
          createHeader("5. Sjekkliste for vernerunde", HeadingLevel.HEADING_1),
          createParagraph("Følgende områder skal kontrolleres ved vernerunde:"),
          
          createSubHeader("Orden og renhold"),
          createBulletPoint("Er arbeidsplassen ryddig og fri for hindringer?"),
          createBulletPoint("Er gangveier og nødutganger fri for hinder?"),
          
          createSubHeader("Maskiner og utstyr"),
          createBulletPoint("Er maskiner i god stand og med fungerende vern?"),
          createBulletPoint("Er service og vedlikehold gjennomført etter plan?"),
          
          createSubHeader("Elektrisk anlegg"),
          createBulletPoint("Er ledninger, stikk og kabler hele og riktig plassert?"),
          createBulletPoint("Er nødlys og brannalarmanlegg testet?"),
          
          createSubHeader("Kjemikalier"),
          createBulletPoint("Er kjemikalier merket og oppbevart riktig?"),
          createBulletPoint("Finnes oppdatert stoffkartotek (SDS)?"),
          
          createSubHeader("Personlig verneutstyr (PVU)"),
          createBulletPoint("Har ansatte nødvendig PVU, og brukes det?"),
          createBulletPoint("Er PVU i tilfredsstillende stand?"),
          
          createSubHeader("Ergonomi og arbeidsstillinger"),
          createBulletPoint("Er arbeidsstillinger hensiktsmessige?"),
          createBulletPoint("Er tunge løft risikovurdert?"),
          
          createSubHeader("Psykososialt arbeidsmiljø"),
          createBulletPoint("Er det god kommunikasjon og samarbeid i arbeidsgruppen?"),
          createBulletPoint("Har ansatte tilgang til støtte ved konflikter / stress?"),
          
          createSubHeader("Førstehjelp og beredskap"),
          createBulletPoint("Er førstehjelpsutstyr og brannslukker tilgjengelig og kontrollert?"),
          createBulletPoint("Kjenner ansatte til nødprosedyrer?"),
          
          // 6. Oppfølging og lukking av avvik
          createHeader("6. Oppfølging og lukking av avvik", HeadingLevel.HEADING_1),
          createBulletPoint("Avvik og tiltak skal følges opp innen fastsatt frist"),
          createBulletPoint("Lukking dokumenteres i skjemaet og signeres av ansvarlig leder"),
          createBulletPoint("Avvik som ikke blir lukket innen frist rapporteres til daglig leder og AMU"),
          
          new Paragraph({ text: "", spacing: { before: 200 } }),
          createParagraph("Bruk HMS Nova for å gjennomføre og dokumentere vernerunder digitalt.", { italic: true }),
          
          // 7. Referanser
          createHeader("7. Referanser", HeadingLevel.HEADING_1),
          createBulletPoint("ISO 9001:2015 – kap. 9.1 (Overvåking og måling)"),
          createBulletPoint("Arbeidsmiljøloven §§ 3-1 og 4-1"),
          createBulletPoint("Internkontrollforskriften § 5"),
          createBulletPoint("Forskrift om utførelse av arbeid"),
          createBulletPoint("Arbeidstilsynet: \"Vernerunde – Slik gjør du det\""),
          
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokumentet er generert av HMS Nova for ${data.companyName}`,
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Rediger og tilpass dokumentet etter dine behov",
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });
  
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

/**
 * HMS-05: AMU Møteprotokoll
 */
export async function generateAMUProtocol(data: GeneratorData): Promise<Buffer> {
  const today = new Date().toLocaleDateString("no-NO");
  
  const doc = new Document({
    sections: [
      {
        properties: { page: { pageNumbers: { formatType: NumberFormat.DECIMAL } } },
        headers: { default: createDocxHeader(data.companyName) },
        footers: { default: createDocxFooter() },
        children: [
          // Title
          new Paragraph({
            text: "📘 AMU MØTEPROTOKOLL",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 400 },
          }),
          
          new Paragraph({
            text: data.companyName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 600 },
          }),
          
          // Metadata
          createMetadataTable({
            documentNumber: "HMS-05",
            title: "AMU Møteprotokoll",
            version: "1.0",
            date: today,
            preparedBy: data.hmsResponsible || data.ceoName,
            approvedBy: "Daglig leder",
            revisionFrequency: "Minimum 1 gang per år eller ved behov",
          }),
          
          new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),
          
          // 1. Formål
          createHeader("1. Formål", HeadingLevel.HEADING_1),
          createParagraph(
            `Formålet med dette dokumentet er å sikre systematisk og dokumentert behandling av HMS-saker, avvik, forbedringsforslag og arbeidsmiljøforhold gjennom regelmessige AMU-møter hos ${data.companyName}.`
          ),
          createParagraph("Protokollen skal vise beslutninger, ansvar og oppfølging av tiltak i virksomheten."),
          
          // 2. Omfang
          createHeader("2. Omfang", HeadingLevel.HEADING_1),
          createParagraph(
            "Protokollen gjelder for alle møter i virksomhetens arbeidsmiljøutvalg (AMU) eller tilsvarende forum der HMS og arbeidsmiljø drøftes."
          ),
          createParagraph("Møtene omfatter både forebyggende arbeid, oppfølging av hendelser, samt planlegging av tiltak for forbedring."),
          
          // 3. Sammensetning av AMU
          createHeader("3. Sammensetning av AMU", HeadingLevel.HEADING_1),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              left: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              right: { style: BorderStyle.SINGLE, size: 1, color: HMS_DARK },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: HMS_GRAY },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Rolle", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 35, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Navn", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Representerer", alignment: AlignmentType.CENTER })],
                    shading: { fill: HMS_PRIMARY, type: ShadingType.CLEAR },
                    width: { size: 35, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Leder (daglig leder / HR)")] }),
                  new TableCell({ children: [new Paragraph(data.ceoName)] }),
                  new TableCell({ children: [new Paragraph("Arbeidsgiver")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Verneombud")] }),
                  new TableCell({ children: [new Paragraph(data.safetyRep || "Ikke oppnevnt")] }),
                  new TableCell({ children: [new Paragraph("Arbeidstaker")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("HMS-ansvarlig")] }),
                  new TableCell({ children: [new Paragraph(data.hmsResponsible || data.ceoName)] }),
                  new TableCell({ children: [new Paragraph("Bedriften")] }),
                ],
              }),
              ...(data.hasBHT && data.bhtProvider
                ? [
                    new TableRow({
                      children: [
                        new TableCell({ children: [new Paragraph("Bedriftshelsetjeneste (BHT)")] }),
                        new TableCell({ children: [new Paragraph(data.bhtContact || data.bhtProvider)] }),
                        new TableCell({ children: [new Paragraph("Rådgiver")] }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
          
          // 4. Agenda for møtet
          createHeader("4. Agenda for møtet", HeadingLevel.HEADING_1),
          createBulletPoint("Godkjenning av innkalling og dagsorden"),
          createBulletPoint("Gjennomgang av forrige møteprotokoll og tiltak"),
          createBulletPoint("Rapport fra vernerunde(r) og risikovurderinger"),
          createBulletPoint("Status på opplæring, kurs og kompetanse"),
          createBulletPoint("Registrerte avvik, ulykker og forbedringsforslag"),
          createBulletPoint("Sykefraværsstatistikk og trivselsvurdering"),
          createBulletPoint("Innkomne saker fra ansatte"),
          createBulletPoint("Eventuelt"),
          createBulletPoint("Fastsettelse av dato for neste møte"),
          
          // 5. Møtereferat
          createHeader("5. Møtereferat / Diskusjonspunkter", HeadingLevel.HEADING_1),
          createParagraph("Bruk HMS Nova for å dokumentere møtereferater digitalt."),
          createParagraph("Systemet hjelper deg med å:"),
          createBulletPoint("Strukturere møteagenda"),
          createBulletPoint("Dokumentere beslutninger og tiltak"),
          createBulletPoint("Tildele ansvar og frister"),
          createBulletPoint("Følge opp utestående saker automatisk"),
          
          // 6. Oppfølging og evaluering
          createHeader("6. Oppfølging og evaluering", HeadingLevel.HEADING_1),
          createBulletPoint("Tiltak fra møtet følges opp i neste AMU-møte eller i HMS-systemet (HMS Nova)"),
          createBulletPoint("Utestående saker skal alltid stå som åpne til de er bekreftet lukket"),
          createBulletPoint("Resultater og forbedringer vurderes i ledelsens gjennomgang (ISO 9001 kap. 9.3)"),
          
          // 7. Referanser
          createHeader("7. Referanser", HeadingLevel.HEADING_1),
          createBulletPoint("ISO 9001:2015 – Kapittel 9.3 (Ledelsens gjennomgang)"),
          createBulletPoint("Arbeidsmiljøloven §§ 7-1 til 7-4"),
          createBulletPoint("Internkontrollforskriften § 5"),
          createBulletPoint("Arbeidstilsynet: «Arbeidsmiljøutvalg – plikt og oppgaver»"),
          
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Dokumentet er generert av HMS Nova for ${data.companyName}`,
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Rediger og tilpass dokumentet etter dine behov",
                italics: true,
                color: HMS_GRAY,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });
  
  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

// Export helper to generate all documents
export { Document, Paragraph };

