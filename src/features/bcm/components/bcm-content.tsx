"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchBcmData } from "@/server/queries/bcm.queries";
import { BcmWizard } from "./bcm-wizard";
import { BcmTemplates } from "./bcm-templates";
import { ShieldCheck, Plus, FileText, ClipboardList } from "lucide-react";

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
  const [showWizard, setShowWizard] = useState(false);

  const { data } = useQuery({
    queryKey: ["bcm"],
    queryFn: () => fetchBcmData(),
    initialData,
  });

  if (!data) return null;

  const { bcmDocuments, auditsRaw, bcmForms, availableTemplates, activatedTemplateIds, hasWizardPlan } = data;

  const continuityAudits = auditsRaw.filter((audit: any) => {
    const areaValue = audit.area?.toLowerCase() ?? "";
    const titleValue = audit.title.toLowerCase();
    return (
      areaValue.includes("kontinuitet") ||
      titleValue.includes("bcm") ||
      titleValue.includes("kontinuitet")
    );
  });

  if (showWizard) {
    return <BcmWizard onComplete={() => setShowWizard(false)} />;
  }

  const showEmptyState = bcmDocuments.length === 0 && !hasWizardPlan;

  return (
    <div className="space-y-8">
      {showEmptyState && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Kom i gang med beredskap</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              En beredskapsplan hjelper virksomheten å håndtere kriser. Bruk veiviseren for å lage din første plan
              på noen minutter — ingen forhåndskunnskap nødvendig.
            </p>
            <Button size="lg" onClick={() => setShowWizard(true)}>
              <Plus className="mr-2 h-5 w-5" /> Lag din beredskapsplan
            </Button>
          </CardContent>
        </Card>
      )}

      {!showEmptyState && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dine BCM-planer</h2>
            <p className="text-sm text-muted-foreground">
              {bcmDocuments.length} dokument{bcmDocuments.length !== 1 ? "er" : ""} opprettet
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="mr-2 h-4 w-4" /> Ny beredskapsplan
          </Button>
        </div>
      )}

      {bcmDocuments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bcmDocuments.map((doc: any) => (
            <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{doc.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {doc.template?.name || "Plan"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="shrink-0">{doc.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Revidert: {formatDate(doc.updatedAt)}</span>
                    <span>Neste: {formatDate(doc.nextReviewDate)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {availableTemplates && availableTemplates.length > 0 && (
        <BcmTemplates templates={availableTemplates} activatedTemplateIds={activatedTemplateIds || []} />
      )}

      {continuityAudits.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Kontinuitetsøvelser og tester</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {continuityAudits.map((audit: any) => (
              <Link key={audit.id} href={`/dashboard/audits/${audit.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-sm">{audit.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {audit.area || "Kontinuitet"} · {formatDate(audit.scheduledDate)}
                      </p>
                    </div>
                    <Badge variant="outline">{audit.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {bcmForms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Beredskapsrelaterte skjemaer</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bcmForms.map((form: any) => (
              <Link key={form.id} href={`/dashboard/forms/${form.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-orange-50 p-2 dark:bg-orange-950">
                        <ClipboardList className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">{form.title}</h3>
                          <Badge variant="secondary" className="ml-2 shrink-0">{form._count.submissions}</Badge>
                        </div>
                        {form.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
