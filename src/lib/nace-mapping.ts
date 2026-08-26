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
  "62.03": "it_drift",
  "62.09": "annen_it",
  "63.11": "databehandling",
  "63.12": "nettportal",

  // Kontor og profesjonelle tjenester
  "69.10": "advokatvirksomhet",
  "69.20": "regnskap_revisjon",
  "70.10": "hovedkontor",
  "70.21": "pr_kommunikasjon",
  "70.22": "bedriftsradgivning",
  "71.11": "arkitekt",
  "71.12": "teknisk_radgivning",
  "71.20": "teknisk_testing",
  "73.11": "reklamebyraa",
  "73.12": "medieformidling",
  "74.10": "design",
  "74.20": "fotografvirksomhet",
  "74.30": "oversettelsetjenester",
  "74.90": "annen_faglig_virksomhet",
  "78.10": "bemanningsbyraa",
  "78.20": "vikarbyraa",
  "80.10": "vakthold",
  "80.20": "sikkerhetstjenester",
  "82.11": "kontortjenester",
  "82.19": "kopiering_kontor",
  "82.20": "callsenter",
  "82.30": "messer_konferanser",
  "82.99": "annen_kontorstoette",

  // AV, montasje og installasjon
  "26.30": "kommunikasjonsutstyr",
  "26.40": "forbrukerelektronikk",
  "33.12": "reparasjon_maskiner",
  "33.13": "reparasjon_elektronikk",
  "33.14": "reparasjon_elektrisk",
  "33.20": "installasjon_maskiner",
  "43.29": "annen_installasjon",
  "59.11": "film_tv_produksjon",
  "59.20": "lydopptak_musikk",
  "60.10": "radio",
  "60.20": "tv_virksomhet",
  "61.10": "telekommunikasjon",
  "61.20": "tradlos_telekom",
  "61.90": "annen_telekom",
  "77.33": "utleie_it_kontor",
  "95.11": "reparasjon_datamaskiner",
  "95.12": "reparasjon_kommunikasjonsutstyr",

  // Finans og forsikring
  "64.11": "sentralbank",
  "64.19": "bank",
  "65.11": "livsforsikring",
  "65.12": "skadeforsikring",
  "66.11": "fondsforvaltning",
  "66.19": "annen_finans",
  "66.21": "forsikringsmegling",

  // Utdanning
  "85.10": "grunnskole",
  "85.20": "videregaaende",
  "85.31": "fagskole",
  "85.42": "hoyere_utdanning",
  "85.51": "idrettsopplaering",
  "85.52": "kulturskole",
  "85.59": "annen_undervisning",
  "85.60": "utdanningsstoette",

  // Personlig tjenesteyting
  "96.01": "vaskeri",
  "96.02": "frisor",
  "96.04": "velvaere_spa",

  // Kultur, underholdning og sport
  "90.01": "scenekunst",
  "90.02": "tilknyttet_scenekunst",
  "90.03": "kunstnerisk_virksomhet",
  "91.01": "bibliotek",
  "91.02": "museum",
  "91.03": "historiske_steder",
  "93.11": "idrettsanlegg",
  "93.13": "treningssenter",
  "93.19": "annen_idrett",
  "93.21": "fornoyelsespark",
  "93.29": "annen_underholdning",
};

export function getSubIndustryFromNace(naceCode: string): string | null {
  const trimmed = naceCode.trim();
  return naceToSubIndustry[trimmed] ?? null;
}
