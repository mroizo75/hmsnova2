"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { fetchBcmData } from "@/server/queries/bcm.queries";

type BcmData = NonNullable<Awaited<ReturnType<typeof fetchBcmData>>>;

interface BcmContentProps {
  initialData: BcmData;
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BcmContent({ initialData }: BcmContentProps) {
  const { data } = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchBcmData(),
    initialData,
  });

  if (!data) return null;

  const { bcmDocuments, auditsRaw, bcmForms } = data;

  const continuityAudits = auditsRaw.filter((audit: any) => {
    const areaValue = audit.area?.toLowerCase() ?? "";
    const titleValue = audit.title.toLowerCase();
    return (
      areaValue.includes("kontinuitet") ||
      titleValue.includes("bcm") ||
      titleValue.includes("kontinuitet")
    );
  });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>BCM-planer og dokumenter</CardTitle>
            <CardDescription>Planer, krisehåndbøker og gjenopprettingsstrategier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bcmDocuments.length === 0 && (
              <p className="text-sm text-muted-foreground">Ingen BCM-dokumenter registrert enda.</p>
            )}
            {bcmDocuments.map((doc: any) => (
              <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}>
                <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.template?.name || "Plan"} · Revidert {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline">{doc.status}</Badge>
                    <p className="text-xs text-muted-foreground">
                      Neste gjennomgang: {formatDate(doc.nextReviewDate)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kontinuitetsøvelser og tester</CardTitle>
            <CardDescription>Planlagte og fullførte øvelser med fokus på gjenoppretting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {continuityAudits.length === 0 && (
              <p className="text-sm text-muted-foreground">Ingen øvelser planlagt.</p>
            )}
            {continuityAudits.map((audit: any) => (
              <Link key={audit.id} href={`/dashboard/audits/${audit.id}`}>
                <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium">{audit.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {audit.area || "Kontinuitet"} · {formatDate(audit.scheduledDate)}
                    </p>
                  </div>
                  <Badge variant="outline">{audit.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {bcmForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Beredskapsrelaterte skjemaer</CardTitle>
            <CardDescription>Skjemaer for ROS-analyse, beredskapsplaner og øvelsesrapporter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {bcmForms.map((form: any) => (
                <Link key={form.id} href={`/dashboard/bcm`}>
                  <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium">{form.title}</h3>
                      <Badge variant="secondary">{form._count.submissions} svar</Badge>
                    </div>
                    {form.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
