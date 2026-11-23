"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { HOME_STEPS } from "./home-content";

export function HomeSteps() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(true);
  const step = HOME_STEPS[active];

  return (
    <>
      <div className="flex flex-col gap-2 lg:hidden">
        {HOME_STEPS.map((item, index) => {
          const selected = open && index === active;
          return (
            <div
              key={item.title}
              className={`rounded-2xl border ${selected ? "border-[#8FE0BF] bg-[#17281E]" : "border-[#2A3F35] bg-transparent"}`}
            >
              <button
                type="button"
                aria-expanded={selected}
                onClick={() => {
                  if (selected) setOpen(false);
                  else {
                    setActive(index);
                    setOpen(true);
                  }
                }}
                className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
              >
                <span
                  className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
                    selected ? "bg-[#8FE0BF] text-[#0F1C17]" : "bg-[#24382E] text-white"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-white">{item.title}</span>
                  <span className="block text-[13px] text-[#B9C7C0]">{item.hint}</span>
                </span>
                <span className="text-[22px] text-[#8FE0BF]" aria-hidden="true">
                  {selected ? "−" : "+"}
                </span>
              </button>
              {selected ? (
                <div className="px-3.5 pb-4 pl-[60px]">
                  <p className="mb-3 text-[15px] text-[#CFDAD4]">{item.body}</p>
                  <ul className="flex flex-col gap-2">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm text-white">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8FE0BF]" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hidden gap-7 lg:flex">
        <ol className="flex min-w-0 flex-1 flex-col gap-2.5">
          {HOME_STEPS.map((item, index) => {
            const selected = index === active;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className={`flex w-full items-center gap-4 rounded-[18px] border px-5 py-[18px] text-left ${
                    selected ? "border-[#8FE0BF] bg-[#17281F]" : "border-[#2A3F35] bg-transparent"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${
                      selected ? "bg-[#8FE0BF] text-[#0F1C17]" : "bg-[#24382E] text-white"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-[17px] font-bold text-white">{item.title}</span>
                    <span className="block text-sm text-[#B9C7C0]">{item.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex min-w-0 flex-[1.4] flex-col gap-4 rounded-3xl border border-[#2A3F35] bg-[#17281F] p-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#8FE0BF]">Steg {active + 1}</p>
          <h3 className="font-[family-name:var(--font-display)] text-[34px] font-extrabold tracking-[-0.02em] text-white">{step.heading}</h3>
          <p className="text-[17px] text-[#CFDAD4]">{step.body}</p>
          <ul className="mt-1 flex flex-col gap-2.5">
            {step.points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-base text-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8FE0BF] text-[#0F1C17]">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex gap-2.5 pt-3.5">
            <button
              type="button"
              onClick={() => setActive((current) => (current + HOME_STEPS.length - 1) % HOME_STEPS.length)}
              className="rounded-full border border-[#3A5247] px-[18px] py-3 text-base font-semibold text-white"
            >
              Forrige
            </button>
            <button
              type="button"
              onClick={() => setActive((current) => (current + 1) % HOME_STEPS.length)}
              className="rounded-full bg-[#8FE0BF] px-5 py-3 text-base font-bold text-[#0F1C17]"
            >
              Neste steg
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
