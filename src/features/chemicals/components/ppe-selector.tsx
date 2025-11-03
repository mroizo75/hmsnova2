"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

// De mest vanlige PPE-ikonene (ISO 7010)
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
  { id: "M016", name: "Svei sesele", file: "ISO_7010_M016.svg.png" },
  { id: "M017", name: "Beskyttende forkle", file: "ISO_7010_M017.svg.png" },
  { id: "M018", name: "Vernesko", file: "ISO_7010_M018.svg.png" },
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
      
      <ScrollArea className="h-[300px] pr-4">
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
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

