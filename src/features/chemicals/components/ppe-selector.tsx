"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PPE_PICTOGRAMS } from "@/lib/pictograms";

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

  const toggle = (file: string) => {
    const next = selected.includes(file)
      ? selected.filter((f) => f !== file)
      : [...selected, file];
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="requiredPPE" value={JSON.stringify(selected)} />

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {PPE_PICTOGRAMS.map((ppe) => {
          const isSelected = selected.includes(ppe.file);
          return (
            <button
              key={ppe.id}
              type="button"
              title={ppe.name}
              onClick={() => toggle(ppe.file)}
              className={cn(
                "relative aspect-square rounded-lg border-2 transition-all",
                isSelected
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <Image
                src={`/ppe/${ppe.file}`}
                alt={ppe.name}
                fill
                className="object-contain p-1.5"
                unoptimized
              />
              {isSelected && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 ? (
        <p className="text-xs text-blue-700 font-medium">
          {selected.length} verneutstyr valgt
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Klikk for å velge påkrevd verneutstyr
        </p>
      )}
    </div>
  );
}
