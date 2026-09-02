/**
 * SDS (Safety Data Sheet) PDF Parser
 * Bruker AI til å trekke ut strukturert data fra sikkerhetsdatablad
 */

import { extractTextFromPDF as adobeExtractText } from "./adobe-pdf";
import { isAiEnabledForTenant } from "@/lib/ai";

interface SDSExtractedData {
  productName?: string;
  supplier?: string;
  emergencyPhone?: string;
  casNumber?: string; // Enkelt CAS-nummer (hovedstoff)
  casNumbers?: string[]; // Array av CAS-nummer (for kompatibilitet)
  ecNumbers?: string[];
  hazardStatements?: string[];
  precautionaryStatements?: string[];
  pictograms?: string[];
  signalWord?: "FARE" | "ADVARSEL" | null;
  physicalState?: string;
  flashPoint?: string;
  exposureLimits?: Array<{
    substance: string;
    limit: string;
    timeWeighted?: string;
  }>;
  ppe?: {
    eye?: boolean;
    hand?: boolean;
    respiratory?: boolean;
    skin?: boolean;
  };
  // Direkte mapping til skjemafelter
  warningPictograms?: string[]; // Filnavn: ["brannfarlig.webp", "giftig.webp"]
  requiredPPE?: string[]; // Filnavn: ["ISO_7010_M002.svg.png", "ISO_7010_M007.svg.png"]
  storageConditions?: string;
  incompatibleMaterials?: string[];
  disposalInstructions?: string;
  containsIsocyanates?: boolean; // Inneholder diisocyanater - krever spesialkurs
  isocyanateDetails?: string; // Detaljer om hvilke isocyanater
  confidence?: number; // 0-1, hvor sikker er AI på ekstraheringen
}

/**
 * Ekstraher tekst fra PDF med Adobe SDK
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const adobeClientId = process.env.ADOBE_CLIENT_ID;
  const adobeClientSecret = process.env.ADOBE_CLIENT_SECRET;
  
  // Sjekk om Adobe er konfigurert
  if (!adobeClientId || !adobeClientSecret) {
    console.warn("Adobe ikke konfigurert - hopper over PDF-parsing");
    throw new Error("Adobe PDF Services er ikke konfigurert");
  }

  try {
    // Bruk Adobe SDK for profesjonell tekstekstraksjon
    const extractedText = await adobeExtractText(pdfBuffer);
    return extractedText;
  } catch (error) {
    console.error("Adobe PDF extraction error:", error);
    throw error;
  }
}


/**
 * Bruk AI til å ekstrahere strukturert data fra SDS-tekst
 */
async function extractSDSDataWithAI(pdfText: string, tenantId?: string): Promise<SDSExtractedData> {
  // Sjekk om OpenAI API-nøkkel er satt
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("OpenAI API key ikke satt - hopper over AI-ekstraksjon");
    return { confidence: 0 };
  }

  if (tenantId && !(await isAiEnabledForTenant(tenantId))) {
    console.warn("AI er deaktivert for denne virksomheten - hopper over AI-ekstraksjon, bruker regex-fallback");
    return { confidence: 0 };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Billigere modell for ekstraksjon
        messages: [
          {
            role: "system",
            content: `Du er en ekspert på sikkerhetsdatablad (SDS). Ekstraher informasjon og RETURNER KUN VALID JSON.

VIKTIG: Svar BARE med JSON-objektet, ingen annen tekst før eller etter.

Ekstraher:
- Produktnavn
- Leverandør
- CAS-nummer (velg hovedstoffet)
- H-setninger (som en streng, f.eks. "H226 (Brannfarlig væske og damp), H315 (Irriterer huden)")
- Faresymboler (bruk EKSAKTE filnavn)
- PPE (personlig verneutstyr) (bruk EKSAKTE filnavn)
- Isocyanater (MDI, TDI, HDI, IPDI, etc.)

FAREMERKER - bruk disse filnavnene basert på GHS-piktogrammer:
- GHS02 (Brannfarlig) → "brannfarlig.webp"
- GHS03 (Oksiderende) → "oksiderende.webp"
- GHS04 (Gass under trykk) → "gass_under_trykk.webp"
- GHS05 (Etsende) → "etsende.webp"
- GHS06 (Giftig) → "giftig.webp"
- GHS07 (Helsefare, irriterende) → "helserisiko.webp"
- GHS08 (Kronisk helsefare) → "kronisk_helsefarlig.webp"
- GHS09 (Miljøfare) → "miljofare.webp"
- GHS01 (Eksplosivt) → "explosive.webp"

PPE (ISO 7010 M-koder fra Wikipedia) - velg basert på risiko i SDS:
- Vernebriller (for øyebeskyttelse) → "ISO_7010_M004.svg.png"
- Hørselsvern (for støy) → "ISO_7010_M003.svg.png"
- Vernehansker (for hudkontakt) → "ISO_7010_M009.svg.png"
- Verneklær (for hudkontakt) → "ISO_7010_M010.svg.png"
- Ansiktsskjerm (for ansiktsbeskyttelse) → "ISO_7010_M013.svg.png"
- Hjelm (for hodebeskyttelse) → "ISO_7010_M014.svg.png"
- Åndedrettsvern (for innånding/gass/damp) → "ISO_7010_M017.svg.png"
- Fotvern (for fot/sikkerhetssko) → "ISO_7010_M008.svg.png"

JSON-format:
{
  "productName": "string",
  "supplier": "string",
  "casNumber": "123-45-6",
  "hazardStatements": "H226 (Brannfarlig væske og damp), H315 (Irriterer huden)",
  "warningPictograms": ["brannfarlig.webp", "helserisiko.webp"],
  "requiredPPE": ["ISO_7010_M002.svg.png", "ISO_7010_M007.svg.png"],
  "containsIsocyanates": false,
  "isocyanateDetails": null,
  "confidence": 0.95
}`,
          },
          {
            role: "user",
            content: `Ekstraher data fra dette sikkerhetsdatabladet. SVAR KUN MED JSON:\n\n${pdfText.slice(0, 8000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.error("No content in OpenAI response");
      return { confidence: 0 };
    }
    
    // Parse JSON fra AI-respons
    try {
      const extracted = JSON.parse(content);
      return {
        ...extracted,
        confidence: extracted.confidence || 0.8,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      // Prøv å trekke ut JSON fra tekst hvis AI la til ekstra tekst
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          return {
            ...extracted,
            confidence: extracted.confidence || 0.6,
          };
        } catch {
          console.error("Could not extract JSON from response");
        }
      }
      return { confidence: 0 };
    }
  } catch (error) {
    console.error("AI extraction error:", error);
    return { confidence: 0 };
  }
}

/**
 * Parse regex-basert ekstraksjon som fallback
 */
function extractSDSDataRegex(pdfText: string): Partial<SDSExtractedData> {
  const extracted: Partial<SDSExtractedData> = {};

  // Ekstraher CAS-nummer (format: 123-45-6)
  const casMatches = pdfText.match(/\b\d{2,7}-\d{2}-\d\b/g);
  if (casMatches) {
    extracted.casNumbers = [...new Set(casMatches)];
  }

  // Ekstraher H-setninger (H200-H999)
  const hStatements = pdfText.match(/H\d{3}[A-Za-z]?[:\s]+[^\n]+/g);
  if (hStatements) {
    extracted.hazardStatements = hStatements.map(s => s.trim());
  }

  // Ekstraher P-setninger (P100-P999)
  const pStatements = pdfText.match(/P\d{3}[:\s]+[^\n]+/g);
  if (pStatements) {
    extracted.precautionaryStatements = pStatements.map(s => s.trim());
  }

  // Ekstraher signalord
  if (pdfText.includes("FARE") || pdfText.includes("DANGER")) {
    extracted.signalWord = "FARE";
  } else if (pdfText.includes("ADVARSEL") || pdfText.includes("WARNING")) {
    extracted.signalWord = "ADVARSEL";
  }

  extracted.confidence = 0.6; // Lavere confidence for regex-basert

  return extracted;
}

/**
 * Hovedfunksjon for å parse SDS
 */
export async function parseSDSFile(pdfBuffer: Buffer, tenantId?: string): Promise<SDSExtractedData> {
  try {
    // 1. Ekstraher tekst fra PDF
    const pdfText = await extractTextFromPDF(pdfBuffer);

    // 2. Prøv AI-ekstraksjon først (hoppes over hvis AI er deaktivert for tenanten)
    const aiExtracted = await extractSDSDataWithAI(pdfText, tenantId);

    // 3. Hvis AI feiler eller har lav confidence, bruk regex som backup
    if (!aiExtracted || aiExtracted.confidence! < 0.5) {
      const regexExtracted = extractSDSDataRegex(pdfText);
      
      // Alltid sjekk for isocyanater selv ved fallback
      const isocyanateCheck = detectIsocyanates(
        regexExtracted.productName || "",
        regexExtracted.casNumbers || [],
        pdfText
      );
      
      return { 
        ...regexExtracted, 
        containsIsocyanates: isocyanateCheck.containsIsocyanates,
        isocyanateDetails: isocyanateCheck.details,
        confidence: 0.6 
      };
    }

    // Dobbelsjekk isocyanater også ved AI-ekstraksjon
    const isocyanateCheck = detectIsocyanates(
      aiExtracted.productName || "",
      aiExtracted.casNumbers || [],
      pdfText
    );

    return {
      ...aiExtracted,
      containsIsocyanates: aiExtracted.containsIsocyanates || isocyanateCheck.containsIsocyanates,
      isocyanateDetails: aiExtracted.isocyanateDetails || isocyanateCheck.details,
    };
  } catch (error) {
    console.error("SDS parsing error:", error);
    throw error;
  }
}

/**
 * Map GHS-piktogrammer til filnavn
 */
export function mapPictogramsToFiles(pictograms: string[]): string[] {
  const mapping: Record<string, string> = {
    "GHS01": "ghs01-eksplosiv.webp",
    "GHS02": "ghs02-brannfarlig.webp",
    "GHS03": "ghs03-oksiderende.webp",
    "GHS04": "ghs04-gass-under-trykk.webp",
    "GHS05": "ghs05-etsende.webp",
    "GHS06": "ghs06-giftig.webp",
    "GHS07": "ghs07-farlig.webp",
    "GHS08": "ghs08-helsefare.webp",
    "GHS09": "ghs09-miljofarlig.webp",
  };

  return pictograms.map(p => mapping[p] || p).filter(Boolean);
}

/**
 * Detekter om produktet inneholder isocyanater
 * VIKTIG: Produkter med isocyanater krever spesialkurs (EU-forordning 2020/1149)
 */
export function detectIsocyanates(
  productName: string,
  casNumbers: string[],
  pdfText: string
): { containsIsocyanates: boolean; details?: string } {
  const isocyanateKeywords = [
    "isocyanat",
    "diisocyanat",
    "MDI",
    "TDI",
    "HDI",
    "IPDI",
    "polyisocyanat",
    "isocyanate",
    "diisocyanate",
  ];

  // Kjente CAS-nummer for vanlige isocyanater
  const isocyanateCAS = [
    "101-68-8", // MDI (Methylen diphenyl diisocyanat)
    "584-84-9", // TDI (Toluen diisocyanat)
    "26471-62-5", // TDI blanding
    "822-06-0", // HDI (Hexametylenen diisocyanat)
    "4098-71-9", // IPDI (Isophoron diisocyanat)
    "5873-54-1", // NDI (Naftalen diisocyanat)
  ];

  // Sjekk CAS-nummer
  const hasCAS = casNumbers.some(cas => isocyanateCAS.includes(cas));
  
  // Sjekk produktnavn
  const hasKeywordInName = isocyanateKeywords.some(keyword => 
    productName.toLowerCase().includes(keyword)
  );
  
  // Sjekk PDF-tekst
  const hasKeywordInText = isocyanateKeywords.some(keyword => 
    pdfText.toLowerCase().includes(keyword)
  );

  const containsIsocyanates = hasCAS || hasKeywordInName || hasKeywordInText;

  if (containsIsocyanates) {
    let details = "Produktet inneholder isocyanater. ";
    if (hasCAS) {
      details += `CAS-nummer funnet: ${casNumbers.filter(c => isocyanateCAS.includes(c)).join(", ")}. `;
    }
    details += "Krever obligatorisk kurs i henhold til EU-forordning 2020/1149.";
    
    return { containsIsocyanates: true, details };
  }

  return { containsIsocyanates: false };
}

/**
 * Foreslå verneutstyr basert på H-setninger
 */
export function suggestPPE(hazardStatements: string[]): {
  eye: boolean;
  hand: boolean;
  respiratory: boolean;
  skin: boolean;
} {
  const ppe = {
    eye: false,
    hand: false,
    respiratory: false,
    skin: false,
  };

  hazardStatements.forEach(statement => {
    const h = statement.match(/H\d{3}/)?.[0];
    if (!h) return;

    // Øyevern
    if (["H314", "H318", "H319", "H335"].includes(h)) {
      ppe.eye = true;
    }

    // Hansker
    if (["H312", "H314", "H315", "H317", "H334"].includes(h)) {
      ppe.hand = true;
    }

    // Åndedrettsvern
    if (["H330", "H331", "H332", "H335", "H336"].includes(h)) {
      ppe.respiratory = true;
    }

    // Hudvern
    if (["H310", "H311", "H312", "H314", "H315"].includes(h)) {
      ppe.skin = true;
    }
  });

  return ppe;
}
