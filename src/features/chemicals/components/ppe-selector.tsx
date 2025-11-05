"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

// Alle PPE-ikoner (ISO 7010 M001-M062)
const COMMON_PPE = [
  { id: "M001", name: "Generelt påbudt", file: "ISO_7010_M001.svg.png" },
  { id: "M002", name: "Vernebriller", file: "ISO_7010_M002.svg.png" },
  { id: "M003", name: "Hjelm", file: "ISO_7010_M003.svg.png" },
  { id: "M004", name: "Hørselsvern", file: "ISO_7010_M004.svg.png" },
  { id: "M005", name: "Åndedrettsvern", file: "ISO_7010_M005.svg.png" },
  { id: "M006", name: "Fotver", file: "ISO_7010_M006.svg.png" },
  { id: "M007", name: "Arbeidshansker", file: "ISO_7010_M007.svg.png" },
  { id: "M008", name: "Verneklær", file: "ISO_7010_M008.svg.png" },
  { id: "M009", name: "Ansiktsskjerm", file: "ISO_7010_M009.svg.png" },
  { id: "M010", name: "Generelt verneutstyr", file: "ISO_7010_M010.svg.png" },
  { id: "M011", name: "Sikkerhetssele", file: "ISO_7010_M011.svg.png" },
  { id: "M012", name: "Fallarrest", file: "ISO_7010_M012.svg.png" },
  { id: "M013", name: "Bruk fallsikring", file: "ISO_7010_M013.svg.png" },
  { id: "M014", name: "Gassmaske", file: "ISO_7010_M014.svg.png" },
  { id: "M015", name: "Beskyttelse mot kjemikalier", file: "ISO_7010_M015.svg.png" },
  { id: "M016", name: "Sveisesele", file: "ISO_7010_M016.svg.png" },
  { id: "M017", name: "Beskyttende forkle", file: "ISO_7010_M017.svg.png" },
  { id: "M018", name: "Vernesko", file: "ISO_7010_M018.svg.png" },
  { id: "M019", name: "Sikkerhetsbelte", file: "ISO_7010_M019.svg.png" },
  { id: "M020", name: "Fotbeskyttelse", file: "ISO_7010_M020.svg.png" },
  { id: "M021", name: "Antistatiske sko", file: "ISO_7010_M021.svg.png" },
  { id: "M022", name: "Ledende sko", file: "ISO_7010_M022.svg.png" },
  { id: "M023", name: "Beskyttende lær", file: "ISO_7010_M023.svg.png" },
  { id: "M024", name: "Beskyttende hansker mot elektrisk støt", file: "ISO_7010_M024.svg.png" },
  { id: "M025", name: "Beskyttende hansker mot kjemikalier", file: "ISO_7010_M025.svg.png" },
  { id: "M026", name: "Beskyttelse mot kalde omgivelser", file: "ISO_7010_M026.svg.png" },
  { id: "M027", name: "Heldekkende ansiktsbeskyttelse", file: "ISO_7010_M027.svg.png" },
  { id: "M028", name: "Hørselsbeskyttelse", file: "ISO_7010_M028.svg.png" },
  { id: "M029", name: "Isolerende hansker", file: "ISO_7010_M029.svg.png" },
  { id: "M030", name: "Bruk fotgenger-rute", file: "ISO_7010_M030.svg.png" },
  { id: "M031", name: "Bruk spesiell rute", file: "ISO_7010_M031.svg.png" },
  { id: "M032", name: "Bruk antistatiske hansker", file: "ISO_7010_M032.svg.png" },
  { id: "M033", name: "Bruk vernehansker", file: "ISO_7010_M033.svg.png" },
  { id: "M034", name: "Les instruksjoner", file: "ISO_7010_M034.svg.png" },
  { id: "M035", name: "Bruk vernebriller med sideskjermer", file: "ISO_7010_M035.svg.png" },
  { id: "M036", name: "Bruk øyebeskyttelse", file: "ISO_7010_M036.svg.png" },
  { id: "M037", name: "Bruk ansiktsbeskyttelse", file: "ISO_7010_M037.svg.png" },
  { id: "M038", name: "Bruk åndedrettsvern", file: "ISO_7010_M038.svg.png" },
  { id: "M039", name: "Bruk hørselsvern", file: "ISO_7010_M039.svg.png" },
  { id: "M040", name: "Bruk vernehjelm", file: "ISO_7010_M040.svg.png" },
  { id: "M041", name: "Bruk verneutstyr", file: "ISO_7010_M041.svg.png" },
  { id: "M042", name: "Bruk verneklær", file: "ISO_7010_M042.svg.png" },
  { id: "M043", name: "Bruk friskluftsapparat", file: "ISO_7010_M043.svg.png" },
  { id: "M044", name: "Bruk vernesko", file: "ISO_7010_M044.svg.png" },
  { id: "M045", name: "Koble fra før arbeid", file: "ISO_7010_M045.svg.png" },
  { id: "M046", name: "Bruk vernehansker ved arbeid", file: "ISO_7010_M046.svg.png" },
  { id: "M047", name: "Bruk heldekkende verneutstyr", file: "ISO_7010_M047.svg.png" },
  { id: "M048", name: "Bruk sikkerhetssele", file: "ISO_7010_M048.svg.png" },
  { id: "M049", name: "Bruk fotbeskyttelse", file: "ISO_7010_M049.svg.png" },
  { id: "M050", name: "Bruk beskyttende hansker", file: "ISO_7010_M050.svg.png" },
  { id: "M051", name: "Bruk hørselsvern med øreklokker", file: "ISO_7010_M051.svg.png" },
  { id: "M052", name: "Bruk gassmaske", file: "ISO_7010_M052.svg.png" },
  { id: "M053", name: "Bruk vernehjelm med ørebeskyttelse", file: "ISO_7010_M053.svg.png" },
  { id: "M054", name: "Bruk støvmaske", file: "ISO_7010_M054.svg.png" },
  { id: "M055", name: "Bruk vernehjelm med ansiktsskjerm", file: "ISO_7010_M055.svg.png" },
  { id: "M056", name: "Bruk sveisemaske", file: "ISO_7010_M056.svg.png" },
  { id: "M057", name: "Bruk anti-kutt hansker", file: "ISO_7010_M057.svg.png" },
  { id: "M058", name: "Bruk anti-vibrasjonshansker", file: "ISO_7010_M058.svg.png" },
  { id: "M059", name: "Bruk varmebeskyttelse", file: "ISO_7010_M059.svg.png" },
  { id: "M060", name: "Bruk beskyttende sko mot varme", file: "ISO_7010_M060.svg.png" },
  { id: "M061", name: "Bruk beskyttende hansker mot varme", file: "ISO_7010_M061.svg.png" },
  { id: "M062", name: "Bruk beskyttende klær mot varme", file: "ISO_7010_M062.svg.png" },
];

interface PPESelectorProps {
  defaultValue?: string;
  onChange?: (selected: string[]) => void;
}

export function PPESelector({ defaultValue, onChange }: PPESelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (defaultValue) {
      try {
        const parsed = JSON.parse(defaultValue);
        setSelected(Array.isArray(parsed) ? parsed : []);
      } catch {
        setSelected([]);
      }
    }
  }, [defaultValue]);

  const togglePPE = (file: string) => {
    const newSelected = selected.includes(file)
      ? selected.filter((f) => f !== file)
      : [...selected, file];
    
    setSelected(newSelected);
    onChange?.(newSelected);
  };

  return (
    <div className="space-y-4">
      <Label>Påkrevd personlig verneutstyr (PPE)</Label>
      <input type="hidden" name="requiredPPE" value={JSON.stringify(selected)} />
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {COMMON_PPE.map((ppe) => (
            <button
              key={ppe.id}
              type="button"
              onClick={() => togglePPE(ppe.file)}
              className={cn(
                "relative aspect-square rounded-lg border-2 p-2 transition-all hover:scale-105",
                selected.includes(ppe.file)
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                  : "border-gray-200 hover:border-gray-300"
              )}
              title={ppe.name}
            >
              <Image
                src={`/ppe/${ppe.file}`}
                alt={ppe.name}
                fill
                className="object-contain p-1"
              />
              {selected.includes(ppe.file) && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>

      {selected.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Valgte: {selected.length} PPE-krav
        </div>
      )}
    </div>
  );
}

