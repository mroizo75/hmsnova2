export const HAZARDOUS_WASTE_TYPES = [
  { value: "KJOLEVAESKE", label: "Kjølevæske / glykol" },
  { value: "SPILLOLJE", label: "Spillolje" },
  { value: "OLJEFILTER", label: "Oljefilter" },
  { value: "BREMSEVAESKE", label: "Bremsevæske" },
  { value: "BATTERI", label: "Batteri" },
  { value: "SPRAYBOKS", label: "Sprayboks" },
  { value: "MALING_LOSEMIDDEL", label: "Maling / løsemiddel" },
  { value: "ANNET", label: "Annet farlig avfall" },
] as const;

export type HazardousWasteTypeValue = (typeof HAZARDOUS_WASTE_TYPES)[number]["value"];

export const AVFALLSDEKLARERING_URL = "https://www.avfallsdeklarering.no";

export function hazardousWasteLabel(wasteType: string, customType?: string | null): string {
  if (wasteType === "ANNET" && customType?.trim()) return customType.trim();
  return HAZARDOUS_WASTE_TYPES.find((item) => item.value === wasteType)?.label ?? wasteType;
}
