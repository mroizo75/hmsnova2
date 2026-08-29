"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJuridiskRegisterData } from "@/server/queries/juridisk-register.queries";
import { JuridiskRegisterClient } from "@/app/(dashboard)/dashboard/juridisk-register/client";

type JuridiskData = NonNullable<Awaited<ReturnType<typeof fetchJuridiskRegisterData>>>;

interface JuridiskRegisterContentProps {
  initialData: JuridiskData;
}

export function JuridiskRegisterContent({ initialData }: JuridiskRegisterContentProps) {
  const { data } = useQuery({
    queryKey: ["juridisk-register"],
    queryFn: () => fetchJuridiskRegisterData(),
    initialData,
  });

  if (!data) return null;

  return (
    <JuridiskRegisterClient
      regulatoryStatus={data.regulatoryStatus}
      userRole={data.userRole}
      manualReferences={data.manualReferences}
      routineSuggestions={data.routineSuggestions ?? []}
    />
  );
}
