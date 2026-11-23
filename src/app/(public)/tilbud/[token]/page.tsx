import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptTenantOffer } from "@/server/actions/tenant.actions";
import { prisma } from "@/lib/db";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export const metadata = {
  title: "Tilbud fra HMS Nova",
  robots: { index: false, follow: false },
};

async function getOffer(token: string) {
  const offer = await prisma.tenantOffer.findUnique({
    where: { token },
    include: {
      tenant: true,
    },
  });

  if (!offer) {
    return null;
  }

  return offer;
}

function getOfferUnavailableContent(offer: Awaited<ReturnType<typeof getOffer>>) {
  if (!offer) {
    return {
      title: "Tilbud ikke funnet",
      description: "Vi finner ikke dette tilbudet. Sjekk at lenken er riktig eller ta kontakt med oss.",
    };
  }

  switch (offer.status) {
    case "ACCEPTED":
      return {
        title: "Tilbud allerede godkjent",
        description: "Dette tilbudet er allerede akseptert og avtalen er aktiv.",
      };
    case "REJECTED":
      return {
        title: "Tilbud avvist",
        description: "Dette tilbudet er avvist.",
      };
    case "EXPIRED":
      return {
        title: "Tilbud utløpt",
        description: "Dette tilbudet har utløpt.",
      };
    case "DRAFT":
      return {
        title: "Tilbud ikke sendt",
        description: "Dette tilbudet er ikke sendt ennå.",
      };
    default:
      return {
        title: "Tilbud ikke tilgjengelig",
        description: "Dette tilbudet er ikke tilgjengelig.",
      };
  }
}

async function OfferDetails({ token }: { token: string }) {
  const offer = await getOffer(token);

  if (!offer || offer.status !== "SENT") {
    const content = getOfferUnavailableContent(offer);
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleAccept = async () => {
    "use server";
    const result = await acceptTenantOffer(token);

    if (!result.success) {
      redirect(`/tilbud/${token}?status=error`);
    }

    redirect(`/tilbud/${token}?status=accepted`);
  };

  const yearlyPrice = offer.yearlyPrice;
  const setupPrice = offer.setupPrice ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tilbud på HMS Nova</CardTitle>
          <CardDescription>
            Tilbud for {offer.tenant.name} ({offer.tenant.orgNumber || "org.nr ikke oppgitt"})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-1">
              Abonnement
            </h2>
            <p className="text-sm">
              Årspris:{" "}
              <span className="font-semibold">
                {yearlyPrice.toLocaleString("nb-NO")} kr/år (eks. mva)
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              12 måneder bindingstid, 3 måneder oppsigelse etter endt binding.
            </p>
          </div>

          {offer.setupPrice != null && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-1">
                Etablering / oppsett av HMS-håndbok
              </h2>
              <p className="text-sm">
                Engangskostnad:{" "}
                <span className="font-semibold">
                  {setupPrice.toLocaleString("nb-NO")} kr (eks. mva)
                </span>
              </p>
            </div>
          )}

          {offer.notes && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-1">
                Tilleggsinformasjon
              </h2>
              <p className="text-sm whitespace-pre-wrap">{offer.notes}</p>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-1">
              Standardvilkår
            </h2>
            <p className="text-sm text-muted-foreground">
              Dette tilbudet følger HMS Novas standard vilkår for bruk av tjenesten, inkludert
              12 måneders bindingstid fra aktivering og 3 måneders oppsigelse etter endt binding.
              Fullstendige vilkår finner du på våre nettsider.
            </p>
          </div>

          <form action={handleAccept} className="pt-6">
            <Button type="submit" className="w-full">
              Godkjenn og aktiver avtale
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function OfferPage({ params }: PageProps) {
  const { token } = await params;

  return <OfferDetails token={token} />;
}

