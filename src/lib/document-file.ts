import { jsPDF } from "jspdf";
import { getStorage } from "@/lib/storage";
import { normalizeStorageKey } from "@/lib/storage-key";

type DocumentFileSource = {
  fileKey: string;
  title: string;
  version: string;
};

export function generateDemoDocumentPdf(title: string, version: string): Buffer {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(title || "HMS-dokument", 20, 28);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Versjon ${version}`, 20, 38);
  pdf.text(`Dato: ${new Date().toLocaleDateString("nb-NO")}`, 20, 45);

  const body = pdf.splitTextToSize(
    "Dette dokumentet er testdata uten opplastet fil. " +
      "Ansatte skal ha tilgang til gjeldende prosedyrer (internkontrollforskriften § 5). " +
      "Den faktiske HMS-håndboken finner du under Ansatt → HMS-håndbok.",
    170
  );
  pdf.text(body, 20, 60);

  return Buffer.from(pdf.output("arraybuffer"));
}

export async function loadDocumentFile(document: DocumentFileSource): Promise<Buffer | null> {
  const key = normalizeStorageKey(document.fileKey);
  if (!key) return null;

  const storage = getStorage();
  const existing = await storage.get(key);
  if (existing) return existing;

  if (!key.startsWith("demo/")) return null;

  const generated = generateDemoDocumentPdf(document.title, document.version);
  try {
    await storage.upload(key, generated);
  } catch (error) {
    console.error(
      "Kunne ikke lagre demo-dokument:",
      error instanceof Error ? error.message : "ukjent feil"
    );
  }
  return generated;
}
