import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { ReportIncidentForm } from "@/components/ansatt/report-incident-form";
import { prisma } from "@/lib/db";
import { hasTenantFeature } from "@/lib/tenant-features";

export default async function NyttAvvik() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const [projects, tenant] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId: session.user.tenantId, status: { in: ["PLANNING", "ACTIVE"] } },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { industry: true },
    }),
  ]);
  const isHealthcareTenant = hasTenantFeature(tenant?.industry, "helseforetak");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <AlertCircle className="h-7 w-7 text-red-600" />
          Rapporter avvik
        </h1>
        <p className="text-muted-foreground">
          Meld fra om farlige situasjoner, ulykker eller nestenulykker
        </p>
      </div>

      {/* Viktig melding */}
      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardContent className="p-4">
          <p className="text-sm text-red-900">
            <strong>🚨 Ved akutt fare:</strong> Ring 110 (brann), 112 (politi) eller 113 (ambulanse) FØRST!
            Rapporter deretter avviket her.
          </p>
        </CardContent>
      </Card>

      {/* Skjema */}
      <Card>
        <CardHeader>
          <CardTitle>Avviksskjema</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportIncidentForm 
            tenantId={session.user.tenantId}
            reportedBy={session.user.name || session.user.email || "Ansatt"}
            projects={projects}
            isHealthcareTenant={isHealthcareTenant}
          />
        </CardContent>
      </Card>

      {/* Hjelp */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">💡 Hva skal jeg rapportere?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>✅ Rapporter alltid:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground ml-2">
              <li>Ulykker og personskader</li>
              <li>Nestenulykker (kunne endt med skade)</li>
              <li>Farlige situasjoner</li>
              <li>Defekt utstyr eller verktøy</li>
              <li>Manglende sikkerhetsutstyr</li>
              <li>Forurensning eller utslipp</li>
            </ul>
          </div>
          
          <div className="pt-2">
            <strong>📝 Husk:</strong>
            <p className="text-muted-foreground mt-1">
              Jo mer detaljer du gir, jo bedre kan vi forebygge lignende hendelser.
              Alle rapporter behandles konfidensielt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

