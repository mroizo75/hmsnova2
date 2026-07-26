"use client";

import { useMemo, useState } from "react";
import { Check, Circle, Lock, MessageSquareQuote } from "lucide-react";
import {
  GUEST_STATUS_ORDER,
  type GuestStatus,
  type GuestType,
} from "../lib/gjesteservice-config";
import { GUEST_TYPE_EMOJI, getGuestDictionary, type GuestLocale } from "../lib/guest-i18n";

interface Props {
  type: GuestType;
  status: GuestStatus;
  locale: GuestLocale;
  createdAt: string;
  acknowledgedAt: string | null;
  respondedAt: string | null;
  closedAt: string | null;
  response: string | null;
  tavleName: string;
  logoUrl: string | null;
  brandColor: string | null;
}

function formatDate(value: string | null, locale: GuestLocale): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString(locale === "en" ? "en-GB" : "nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function GjestSakStatus({
  type,
  status,
  locale: initialLocale,
  createdAt,
  acknowledgedAt,
  respondedAt,
  closedAt,
  response,
  tavleName,
  logoUrl,
  brandColor,
}: Props) {
  const [locale, setLocale] = useState<GuestLocale>(initialLocale);
  const t = useMemo(() => getGuestDictionary(locale), [locale]);

  const accent = brandColor ?? "#0f172a";
  const currentIndex = GUEST_STATUS_ORDER.indexOf(status);

  const timestamps: Record<GuestStatus, string | null> = {
    NY: createdAt,
    LEST: acknowledgedAt,
    BEHANDLET: respondedAt,
    LUKKET: closedAt,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3">
        {logoUrl && <img src={logoUrl} alt={tavleName} className="h-8 max-w-[120px] object-contain shrink-0" />}
        <p className="font-semibold text-sm truncate min-w-0">{tavleName}</p>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {(["nb", "en"] as GuestLocale[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                locale === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {value === "nb" ? "NO" : "EN"}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-5 pb-16">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">{t.statusTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.statusIntro}</p>
        </div>

        <div className="bg-white border rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl leading-none">{GUEST_TYPE_EMOJI[type]}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm">{t.types[type].label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.submittedAt}: {formatDate(createdAt, locale)}
            </p>
          </div>
        </div>

        <ol className="bg-white border rounded-xl p-4 space-y-4">
          {GUEST_STATUS_ORDER.map((step, index) => {
            const reached = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const timestamp = formatDate(timestamps[step], locale);

            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border"
                    style={
                      reached
                        ? { backgroundColor: accent, borderColor: accent, color: "#ffffff" }
                        : undefined
                    }
                  >
                    {reached ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                  </span>
                  {index < GUEST_STATUS_ORDER.length - 1 && (
                    <span
                      className="w-px flex-1 min-h-6 mt-1"
                      style={{ backgroundColor: reached ? accent : "#e2e8f0" }}
                    />
                  )}
                </div>
                <div className="pb-1 min-w-0">
                  <p className={`text-sm ${isCurrent ? "font-semibold" : "font-medium"}`}>
                    {t.statuses[step].label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.statuses[step].description}
                  </p>
                  {timestamp && reached && (
                    <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="bg-white border rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4" style={{ color: accent }} />
            <p className="font-semibold text-sm">{t.answerTitle}</p>
          </div>
          {response ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">{response}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t.answerPending}</p>
          )}
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            {t.confidentialNotice} {t.privacyFooter}
          </p>
        </div>
      </main>
    </div>
  );
}
