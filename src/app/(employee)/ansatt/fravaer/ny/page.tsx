import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import Link from "next/link";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AbsenceForm } from "@/features/absence/components/absence-form";

export default async function AnsattNyFravaerPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canCreateAbsence) redirect("/ansatt/fravaer");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ansatt/fravaer">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          Registrer fravær
        </h1>
        <p className="text-muted-foreground">
          Meld inn sykefravær, ferie eller annet fravær.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fraværsskjema</CardTitle>
        </CardHeader>
        <CardContent>
          <AbsenceForm forEmployee />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4 space-y-2 text-sm text-blue-900">
          <div>
            <strong>Sykefravær:</strong> Egenmelding kan brukes i inntil 3 kalenderdager.
            Etter 3 dager kreves sykmelding fra lege.
          </div>
          <div>
            <strong>Ferie:</strong> Ferie skal avtales med leder i forkant.
            Hovedferie (3 uker) skal normalt tas mellom 1. juni og 30. september.
          </div>
          <div>
            <strong>Permisjon:</strong> Søknad om permisjon skal sendes leder i god tid.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
