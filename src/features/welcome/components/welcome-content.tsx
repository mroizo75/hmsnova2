"use client";

import { useQuery } from "@tanstack/react-query";
import { StartpakkeWizard } from "@/features/onboarding/components/startpakke-wizard";
import { fetchWelcomeData } from "@/server/queries/welcome.queries";

type WelcomeData = NonNullable<Awaited<ReturnType<typeof fetchWelcomeData>>>;

interface WelcomeContentProps {
  initialData: WelcomeData;
}

export function WelcomeContent({ initialData }: WelcomeContentProps) {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchWelcomeData(),
    initialData,
  });

  if (!data) return null;

  return (
    <StartpakkeWizard
      tenantId={data.tenantId}
      tenantName={data.tenantName}
    />
  );
}
