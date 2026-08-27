"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ElectroAdminPanel } from "@/features/elektro/components/electro-admin-panel";
import { fetchSamsvarserklaringer } from "@/server/queries/samsvarserklaringer.queries";

type SamsvarData = NonNullable<Awaited<ReturnType<typeof fetchSamsvarserklaringer>>>;

interface SamsvarserklaringerContentProps {
  initialData: SamsvarData;
}

export function SamsvarserklaringerContent({ initialData }: SamsvarserklaringerContentProps) {
  const { data } = useQuery({
    queryKey: ["samsvarserklaringer"],
    queryFn: () => fetchSamsvarserklaringer(),
    initialData,
  });

  if (!data) return null;

  const { compliance } = data;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registrerte erklæringer</CardDescription>
            <CardTitle className="text-2xl">{compliance.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">samsvarserklæringer i systemet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Siste opplasting</CardDescription>
            <CardTitle className="text-base">
              {compliance.length > 0
                ? new Date(compliance[0].createdAt).toLocaleDateString("nb-NO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Ingen ennå"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {compliance.length > 0 ? compliance[0].title : "Last opp din første erklæring"}
            </p>
          </CardContent>
        </Card>
      </div>

      <ElectroAdminPanel
        compliance={compliance}
        currentUserId={data.currentUserId}
        canCreate={data.canCreate}
        canDeleteAny={data.canDeleteAny}
      />
    </>
  );
}
