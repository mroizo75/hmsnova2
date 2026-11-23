"use client";

import { useState } from "react";
import { HOME_FAQS } from "./home-content";

export function HomeFaq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="divide-y divide-[#101C18]/10 border-y border-[#101C18]/10">
      {HOME_FAQS.map((faq, index) => {
        const expanded = open === index;
        return (
          <div key={faq.question}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? -1 : index)}
            >
              <span className="text-base font-medium text-[#101C18]">{faq.question}</span>
              <span className="text-xl leading-none text-[#101C18]/50" aria-hidden="true">
                {expanded ? "−" : "+"}
              </span>
            </button>
            {expanded ? <p className="max-w-3xl pb-5 leading-relaxed text-[#101C18]/70">{faq.answer}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
