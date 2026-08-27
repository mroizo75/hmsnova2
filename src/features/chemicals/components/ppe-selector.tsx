"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PPE_PICTOGRAMS } from "@/lib/pictograms";
import { ChevronDown, Sparkles } from "lucide-react";

interface PPESelectorProps {
  defaultValue?: string;
  onChange?: (selected: string[]) => void;
  suggestedFiles?: string[];
}

export function PPESelector({ defaultValue, onChange, suggestedFiles = [] }: PPESelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

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

  const hasSuggestions = suggestedFiles.length > 0;
  const suggestedPictograms = PPE_PICTOGRAMS.filter((p) => suggestedFiles.includes(p.file));
  const remainingPictograms = hasSuggestions
    ? PPE_PICTOGRAMS.filter((p) => !suggestedFiles.includes(p.file))
    : PPE_PICTOGRAMS;

  const hasSelectedOutsideSuggestions = selected.some(
    (f) => !suggestedFiles.includes(f)
  );
  const expanded = showAll || !hasSuggestions || hasSelectedOutsideSuggestions;

  function PpeButton({ ppe }: { ppe: (typeof PPE_PICTOGRAMS)[number] }) {
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
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="requiredPPE" value={JSON.stringify(selected)} />

      {hasSuggestions && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-slate-700">Anbefalt fra SDS</span>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {suggestedPictograms.map((ppe) => (
              <PpeButton key={ppe.id} ppe={ppe} />
            ))}
          </div>
        </div>
      )}

      {hasSuggestions && !expanded && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors pt-1"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Vis alt verneutstyr ({remainingPictograms.length} symboler)
        </button>
      )}

      {expanded && (
        <div className="space-y-2">
          {hasSuggestions && (
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">Alt verneutstyr</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          )}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {remainingPictograms.map((ppe) => (
              <PpeButton key={ppe.id} ppe={ppe} />
            ))}
          </div>
        </div>
      )}

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
