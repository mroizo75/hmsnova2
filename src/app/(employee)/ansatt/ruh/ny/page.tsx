import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning } from "lucide-react";
import { ReportRuhForm } from "@/components/ansatt/report-ruh-form";

export default async function NyRuh() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <FileWarning className="h-7 w-7 text-amber-600" />
          Rapport om uønsket hendelse (RUH)
        </h1>
        <p className="text-muted-foreground">
          Meld fra om uønskede hendelser for å bidra til et tryggere arbeidsmiljø
        </p>
      </div>

      <Card className="border-l-4 border-l-red-500 bg-red-50">
        <CardContent className="p-4">
          <p className="text-sm text-red-900">
            <strong>Ved akutt fare:</strong> Ring 110 (brann), 112 (politi) eller 113 (ambulanse) FORST!
            Rapporter deretter hendelsen her.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RUH-skjema</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportRuhForm
            tenantId={session.user.tenantId}
            reportedBy={session.user.name || session.user.email || "Ansatt"}
          />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Hva skal rapporteres?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Rapporter alltid:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground ml-2">
              <li>Personskader (stor eller liten)</li>
              <li>Nestenulykker (kunne endt med skade)</li>
              <li>Materiell skade (utstyr, bygning)</li>
              <li>Brann eller eksplosjon</li>
              <li>Utslipp eller miljøskade</li>
              <li>Trusler eller vold</li>
              <li>Ergonomiske forhold som gir plager</li>
            </ul>
          </div>

          <div className="pt-2">
            <strong>Husk:</strong>
            <p className="text-muted-foreground mt-1">
              Detaljerte rapporter gir bedre forebygging.
              Alle rapporter behandles konfidensielt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
