"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { RegisterDialog } from "@/components/register-dialog";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";
import { PRICE_POINTS } from "./home-content";

export function HomePrice({ featureCount }: { featureCount: number }) {
  const [aiOn, setAiOn] = useState(false);
  const points = PRICE_POINTS.map((point) =>
    point === "Alle funksjonene" ? `Alle ${featureCount} funksjoner` : point
  );

  return (
    <div className="grid overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_-32px_rgba(16,28,24,0.35)] lg:grid-cols-[0.9fr_1.1fr]">
      <div className="bg-[#101C18] p-8 text-white sm:p-10">
        <p className="text-sm font-medium text-white/70">HMS Nova</p>
        <p className="mt-6 text-6xl font-semibold tracking-tight">
          300
          <span className="ml-2 text-lg font-medium text-white/70">kr/mnd</span>
        </p>
        <p className="text-sm text-white/60">eks. mva</p>
        <p className="mt-4 text-sm text-white/70">3 600 kr i året · per bedrift</p>
        <button
          type="button"
          aria-pressed={aiOn}
          onClick={() => setAiOn((current) => !current)}
          className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#17281E] px-4 py-3 text-left"
        >
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${aiOn ? "bg-[#8FE0BF]" : "bg-white/20"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${aiOn ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </span>
          <span>
            <span className="block text-sm font-semibold">Legg til AI-assistent</span>
            <span className="block text-xs text-white/60">
              +{AI_ADDON_NET_MONTHLY_NOK} kr/mnd · risikovurdering, tiltak og tekster
              {aiOn ? " · på" : " · av"}
            </span>
          </span>
        </button>
        <RegisterDialog aiAddon={aiOn}>
          <button
            type="button"
            className="mt-6 h-12 w-full rounded-full bg-[#8FE0BF] text-base font-semibold text-[#101C18]"
          >
            {aiOn ? "Registrer bedrift med AI" : "Registrer bedrift"}
          </button>
        </RegisterDialog>
        <p className="mt-4 text-xs leading-relaxed text-white/55">
          14 dagers angrefrist. Deretter 12 måneders binding og 3 måneders oppsigelse. Ingen oppstartskostnad.
        </p>
      </div>
      <div className="p-8 sm:p-10">
        <h3 className="text-lg font-semibold text-[#101C18]">Dette får du for 300 kr</h3>
        <ul className="mt-6 space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-[#101C18]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0B6E4F]" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
