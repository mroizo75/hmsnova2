"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRiskRegisterData } from "@/server/queries/risk-register.queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskRegisterTable } from "@/features/risks/components/risk-register-table";

type RiskRegisterData = Awaited<ReturnType<typeof fetchRiskRegisterData>>;

interface RiskRegisterContentProps {
  initialData: RiskRegisterData;
}

export function RiskRegisterContent({ initialData }: RiskRegisterContentProps) {
  const { data: rows } = useQuery({
    queryKey: ["risks", "register"],
    queryFn: () => fetchRiskRegisterData(),
    initialData,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enterprise risk register</CardTitle>
          <CardDescription>Helhetlig oversikt over virksomhetens topp-risikoer med koblede kontroller og tiltak</CardDescription>
        </CardHeader>
        <CardContent>
          <RiskRegisterTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
