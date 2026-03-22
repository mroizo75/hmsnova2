"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { useState } from "react";

type ProvidersProps = {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  /** Fra getServerSession – unngår ulik brukertilstand ved SSR vs hydrering (Radix useId-rekkefølge). */
  session: Session | null;
  /** Én verdi per forespørsel; ikke `new Date()` inne i client (gir hydreringsfeil med next-intl). */
  nowISO: string;
};

export function Providers({ children, locale, messages, session, nowISO }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider session={session}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Europe/Oslo"
        now={new Date(nowISO)}
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
