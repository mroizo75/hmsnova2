"use client";

import { useState } from "react";
import { Check } from "lucide-react";

const INDUSTRIES = [
  {
    label: "Bygg og anlegg",
    laws: [
      "Arbeidsmiljøloven",
      "Internkontrollforskriften",
      "Byggherreforskriften",
      "Forskrift om utførelse av arbeid",
    ],
    extra: "standard rutiner og sjekklister for bygg og anlegg",
  },
  {
    label: "Servering",
    laws: [
      "Arbeidsmiljøloven",
      "Internkontrollforskriften",
      "Alkoholloven",
      "Forskrift om næringsmiddelhygiene",
    ],
    extra: "standard rutiner og sjekklister for servering",
  },
  {
    label: "Transport",
    laws: [
      "Arbeidsmiljøloven",
      "Internkontrollforskriften",
      "Vegtrafikkloven",
      "Forskrift om kjøre- og hviletid",
    ],
    extra: "standard rutiner og sjekklister for transport",
  },
  {
    label: "Elektro",
    laws: [
      "Arbeidsmiljøloven",
      "Internkontrollforskriften",
      "Forskrift om elektriske lavspenningsanlegg",
      "Forskrift om utførelse av arbeid",
    ],
    extra: "standard rutiner og sjekklister for elektro",
  },
  {
    label: "Kontor",
    laws: [
      "Arbeidsmiljøloven",
      "Internkontrollforskriften",
      "Forskrift om organisering, ledelse og medvirkning",
      "Arbeidsplassforskriften",
    ],
    extra: "standard rutiner og sjekklister for kontor",
  },
] as const;

export function HomeWizard() {
  const [selected, setSelected] = useState(0);
  const industry = INDUSTRIES[selected];

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#E2E1DA] bg-white shadow-[0_30px_60px_-30px_rgba(15,28,23,0.35)]">
      <div className="flex items-center justify-between border-b border-[#EEEDE7] px-4 py-3.5 sm:px-5">
        <span className="text-[15px] font-bold">Oppsettsveiviser</span>
        <span className="text-[13px] text-[#5A665F]">Steg 2 av 4</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 px-4 pt-3.5 sm:px-5">
        <span className="h-1.5 rounded-full bg-[#0B6E4F]" />
        <span className="h-1.5 rounded-full bg-[#0B6E4F]" />
        <span className="h-1.5 rounded-full bg-[#E6E5DE]" />
        <span className="h-1.5 rounded-full bg-[#E6E5DE]" />
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5A665F] sm:text-[13px]">
          <span className="sm:hidden">Bransje</span>
          <span className="hidden sm:inline">Hvilken bransje er dere i?</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="listbox" aria-label="Velg bransje">
          {INDUSTRIES.map((item, index) => {
            const active = index === selected;
            return (
              <button
                key={item.label}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => setSelected(index)}
                className={`rounded-full px-3.5 py-2 text-sm ${
                  active
                    ? "bg-[#0F1C17] font-semibold text-white"
                    : "border border-[#D5D4CC] bg-white text-[#0F1C17]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mb-2.5 mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5A665F] sm:text-[13px]">
          <span className="sm:hidden">Lagt til i lovregisteret</span>
          <span className="hidden sm:inline">Lagt til i lovregisteret ditt</span>
        </p>
        <ul className="flex flex-col gap-2">
          {industry.laws.map((law) => (
            <li key={law} className="flex items-center gap-2.5 rounded-xl bg-[#F6F5F1] px-3 py-2.5 text-sm">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#0B6E4F] text-white">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              {law}
            </li>
          ))}
        </ul>
        <p className="mt-3.5 text-[13px] text-[#5A665F]">+ {industry.extra}</p>
      </div>
    </div>
  );
}
