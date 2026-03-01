"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { HAZARD_PICTOGRAMS } from "@/lib/pictograms";

interface HazardPictogramSelectorProps {
  defaultValue?: string;
  onChange?: (selected: string[]) => void;
}

export function HazardPictogramSelector({ defaultValue, onChange }: HazardPictogramSelectorProps) {
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

  const toggle = (file: string) => {
    const next = selected.includes(file)
      ? selected.filter((f) => f !== file)
      : [...selected, file];
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="warningPictograms" value={JSON.stringify(selected)} />

      <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
        {HAZARD_PICTOGRAMS.map((pictogram) => {
          const isSelected = selected.includes(pictogram.file);
          return (
            <button
              key={pictogram.id}
              type="button"
              title={pictogram.name}
              onClick={() => toggle(pictogram.file)}
              className={cn(
                "relative aspect-square rounded-lg border-2 transition-all",
                isSelected
                  ? "border-orange-500 bg-orange-50 ring-1 ring-orange-400"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Image
                src={`/faremerker/${pictogram.file}`}
                alt={pictogram.name}
                fill
                className="object-contain p-1.5"
              />
              {isSelected && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <p className="text-xs text-orange-700 font-medium">
          {selected.length} faresymbol{selected.length !== 1 ? "er" : ""} valgt
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Klikk for å velge faresymboler fra sikkerhetsdatabladet
        </p>
      )}
    </div>
  );
}
