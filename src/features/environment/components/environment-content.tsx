"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, AlertTriangle, TimerReset, Activity } from "lucide-react";
import { EnvironmentAspectList } from "@/features/environment/components/environment-aspect-list";
import { CO2CalculatorCard } from "@/features/environment/components/co2-calculator-card";
import { fetchEnvironmentList } from "@/server/queries/environment.queries";

type EnvironmentData = Awaited<ReturnType<typeof fetchEnvironmentList>>;

interface EnvironmentContentProps {
  initialData: EnvironmentData;
}

export function EnvironmentContent({ initialData }: EnvironmentContentProps) {
  const { data } = useQuery({
    queryKey: ["environment"],
    queryFn: () => fetchEnvironmentList(),
    initialData,
  });

  const { aspects, nonCompliantCount, allMeasurements, tenant } = data;

  const total = aspects.length;
  const critical = aspects.filter((aspect: any) => aspect.significanceScore >= 20).length;
  const now = new Date();
  const overdueReviews = aspects.filter(
    (aspect: any) => aspect.nextReviewDate && new Date(aspect.nextReviewDate) < now
  ).length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registrerte aspekter</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Totalt i miljoregisteret</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritiske</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{critical}</div>
            <p className="text-xs text-muted-foreground">Betydning &ge; 20</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Målinger i avvik</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{nonCompliantCount}</div>
            <p className="text-xs text-muted-foreground">Krever korrigerende tiltak</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue revisjoner</CardTitle>
            <TimerReset className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{overdueReviews}</div>
            <p className="text-xs text-muted-foreground">Mangler oppdatert vurdering</p>
          </CardContent>
        </Card>
      </div>

      <CO2CalculatorCard
        measurements={allMeasurements}
        companyName={tenant?.name ?? ""}
      />

      <EnvironmentAspectList aspects={aspects} />
    </>
  );
}
