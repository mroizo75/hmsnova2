import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { getLegalReferencesForIndustry } from "@/server/actions/legal-reference.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { Scale, ExternalLink, BookOpen } from "lucide-react";
import { SUPPORTED_INDUSTRIES } from "@/lib/pricing";

export default async function JuridiskRegisterPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>Ingen tilgang til virksomhet</div>;
  }

  const tenant = userTenant.tenant;
  const industry = tenant.industry ?? null;
  const references = await getLegalReferencesForIndustry(industry);

  const industryLabel =
    SUPPORTED_INDUSTRIES.find((i) => i.value === industry?.toLowerCase())?.label ?? industry ?? "Ikke angitt";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Juridisk register</h1>
            <p className="text-muted-foreground">
              Lover og forskrifter som gjelder for virksomheten din (bransje: {industryLabel})
            </p>
          </div>
          <PageHelpDialog content={helpContent.legalRegister} />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Viktig:</strong> Dette er en oversikt og veiledning. Systemet utgjør ikke juridisk rådgivning.
          Sjekk alltid Lovdata.no eller rådfør deg med jurist ved spørsmål.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relevante referanser</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{references.length}</div>
            <p className="text-xs text-muted-foreground">For bransjen din</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bransje</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{industryLabel}</div>
            <p className="text-xs text-muted-foreground">Filter for lover og forskrifter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kilder</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Lovdata.no, Arbeidstilsynet</p>
            <p className="text-xs text-muted-foreground">Åpne lenker i ny fane</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Lover og forskrifter</h2>
        {references.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Scale className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Ingen juridiske referanser er lagt inn for din bransje ennå.
              </p>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                {industryLabel === "Ikke angitt"
                  ? "Bransjen er ikke satt for virksomheten. Be administrator sette bransje i innstillinger, eller kontakt support for å legge til referanser."
                  : "Administrator kan legge til lover og forskrifter i superadmin. Kontakt support hvis du savner relevante referanser."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {references.map((ref) => (
              <Card key={ref.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{ref.title}</CardTitle>
                        {ref.paragraphRef && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {ref.paragraphRef}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{ref.description}</p>
                    </div>
                    <a
                      href={ref.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Åpne i Lovdata
                    </a>
                  </div>
                </CardHeader>
                {ref.lastVerifiedAt && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      Sist verifisert: {new Date(ref.lastVerifiedAt).toLocaleDateString("nb-NO")}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
