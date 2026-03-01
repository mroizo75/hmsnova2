import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardHat, BookTemplate } from "lucide-react";
import { SjaForm } from "@/components/sja/sja-form";

interface PageProps {
  searchParams: Promise<{ mal?: string }>;
}

export default async function NySja({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { mal: templateId } = await searchParams;

  let templateData: {
    title: string;
    description: string;
    workLocation: string;
    participants: string;
    templateId: string;
    templateName: string;
    hazards: {
      activity: string;
      hazard: string;
      consequence: string;
      probability: number;
      severity: number;
      measures: string;
      responsibleName: string;
    }[];
  } | undefined;

  if (templateId) {
    const template = await prisma.sjaTemplate.findUnique({
      where: { id: templateId, tenantId: session.user.tenantId, isActive: true },
      include: { hazards: { orderBy: { sortOrder: "asc" } } },
    });

    if (template) {
      templateData = {
        title: template.name,
        description: template.description || "",
        workLocation: template.workLocation || "",
        participants: "",
        templateId: template.id,
        templateName: template.name,
        hazards: template.hazards.map((h) => ({
          activity: h.activity,
          hazard: h.hazard,
          consequence: h.consequence || "",
          probability: h.probability,
          severity: h.severity,
          measures: h.measures,
          responsibleName: h.responsibleName || "",
        })),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <HardHat className="h-7 w-7 text-orange-600" />
          {templateData ? "Fyll ut SJA" : "Ny Sikker Jobb Analyse (SJA)"}
        </h1>
        <p className="text-muted-foreground">
          Gjennomfør en SJA før arbeidet starter for å identifisere og håndtere farer
        </p>
      </div>

      {templateData && (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookTemplate className="h-4 w-4 text-purple-600" />
              <p className="text-sm text-purple-900">
                <strong>Mal: {templateData.templateName}</strong> – Farer og tiltak er forhåndsutfylt.
                Du MÅ fylle ut dato, deltakere og vurdere om det er spesielle forhold i dag.
                Du kan også legge til eller fjerne farer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-l-4 border-l-orange-500 bg-orange-50">
        <CardContent className="p-4">
          <p className="text-sm text-orange-900">
            <strong>Viktig:</strong> SJA skal gjennomføres i fellesskap med alle som deltar
            i arbeidet. Alle farer skal identifiseres og tiltak beskrives FØR arbeidet
            starter. Alle deltakere skal bekrefte at de har forstått farene og tiltakene.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SJA-skjema</CardTitle>
        </CardHeader>
        <CardContent>
          <SjaForm
            tenantId={session.user.tenantId}
            userName={session.user.name || session.user.email || "Ansatt"}
            initialData={templateData}
          />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Slik fyller du ut SJA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>Steg for steg:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1 text-muted-foreground ml-2">
              <li>Fyll inn dato, arbeidssted og alle deltakere</li>
              <li>Vurder om det er spesielle forhold i dag (vær, nye folk, endringer)</li>
              <li>Gå gjennom alle farer – legg til nye om nødvendig</li>
              <li>Sørg for at tiltak er beskrevet for hver fare</li>
              <li>Ta bilder av arbeidsområdet hvis relevant</li>
              <li>Alle deltakere skal bekrefte at de har forstått</li>
            </ol>
          </div>
          <div className="pt-2">
            <strong>Når skal SJA gjøres på nytt?</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground ml-2">
              <li>Selv om du bruker en mal, skal SJA alltid fylles ut på nytt hver dag</li>
              <li>Forholdene kan endre seg (vær, personell, utstyr)</li>
              <li>Nye farer kan ha oppstått siden sist</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
