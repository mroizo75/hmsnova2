/**
 * NACE-kode til subIndustry-mapping.
 * Basert på SSB Standard for næringsgruppering (SN2007/NACE Rev. 2).
 * Brukes for å utlede mer granulær bransjetilhørighet fra Brreg-data.
 */

const naceToSubIndustry: Record<string, string> = {
  // Overnatting
  "55.10": "hotell",
  "55.20": "camping",
  "55.30": "ferieleiligheter",

  // Servering
  "56.10": "restaurant",
  "56.21": "catering",
  "56.30": "bar",

  // Bygg og anlegg
  "41.10": "eiendomsutvikling",
  "41.20": "bygg_entreprenor",
  "42.11": "vei_anlegg",
  "42.21": "rorlegger_anlegg",
  "43.11": "riving",
  "43.21": "elektriker",
  "43.22": "rorlegger",
  "43.31": "maler",
  "43.32": "snekker",
  "43.34": "glassarbeid",
  "43.91": "taktekking",
  "43.99": "annet_bygg",

  // Industri og produksjon
  "10.71": "bakeri",
  "10.13": "kjottforedling",
  "10.20": "fiskeforedling",

  // Transport
  "49.31": "busstransport",
  "49.39": "persontransport",
  "49.41": "godstransport",
  "52.10": "lagring",

  // Helse og omsorg
  "86.10": "sykehus",
  "86.21": "legekontor",
  "86.22": "spesialistpraksis",
  "86.90": "annen_helse",
  "87.10": "sykehjem",
  "87.30": "omsorgsbolig",
  "88.10": "hjemmehjelp",
  "88.91": "barnehage",

  // Detaljhandel
  "47.11": "dagligvare",
  "47.19": "varehus",
  "47.30": "bensinstasjon",

  // Jordbruk og skogbruk
  "01.11": "korndyrking",
  "01.41": "melkeproduksjon",
  "01.46": "svineproduksjon",
  "01.47": "fjorfeproduksjon",
  "02.10": "skogbruk",

  // Fiske og akvakultur
  "03.11": "havfiske",
  "03.21": "fiskeoppdrett",

  // Renhold
  "81.21": "renhold",
  "81.10": "eiendomsdrift",

  // Eiendom
  "68.20": "eiendomsforvaltning",

  // IT og kontor
  "62.01": "programvareutvikling",
  "62.02": "it_konsulent",
  "69.10": "advokatvirksomhet",
  "69.20": "regnskap_revisjon",
};

export function getSubIndustryFromNace(naceCode: string): string | null {
  const trimmed = naceCode.trim();
  return naceToSubIndustry[trimmed] ?? null;
}
