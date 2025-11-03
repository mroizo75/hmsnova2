import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Download, CheckCircle, AlertTriangle, Calendar, MapPin, Package } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function ChemicalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const chemical = await prisma.chemical.findUnique({
    where: { id, tenantId },
  });

  if (!chemical) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800 border-green-200">I bruk</Badge>;
      case "PHASED_OUT":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Utfases</Badge>;
      case "ARCHIVED":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Arkivert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = chemical.nextReviewDate && new Date(chemical.nextReviewDate) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/chemicals">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til stoffkartotek
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{chemical.productName}</h1>
              {getStatusBadge(chemical.status)}
            </div>
            {chemical.supplier && (
              <p className="text-muted-foreground">Leverandør: {chemical.supplier}</p>
            )}
          </div>
          <Link href={`/dashboard/chemicals/${chemical.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Rediger
            </Button>
          </Link>
        </div>
      </div>

      {/* Varsel om forfalt revisjon */}
      {isOverdue && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Revisjon forfalt!</p>
                <p className="text-sm text-red-800">
                  Dette kjemikaliet har forfalt revisjonsdato. Vennligst gjennomgå og oppdater
                  sikkerhetsdatabladet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Produktinformasjon */}
        <Card>
          <CardHeader>
            <CardTitle>Produktinformasjon</CardTitle>
            <CardDescription>Detaljer om produktet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chemical.casNumber && (
              <div>
                <p className="text-sm text-muted-foreground">CAS-nummer</p>
                <p className="font-medium">{chemical.casNumber}</p>
              </div>
            )}

            {chemical.hazardClass && (
              <div>
                <p className="text-sm text-muted-foreground">Fareklasse (GHS)</p>
                <p className="font-medium">{chemical.hazardClass}</p>
              </div>
            )}

            {chemical.location && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Lagringssted
                </p>
                <p className="font-medium">{chemical.location}</p>
              </div>
            )}

            {chemical.quantity && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Mengde
                </p>
                <p className="font-medium">
                  {chemical.quantity} {chemical.unit || ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Farepiktogrammer */}
        <Card>
          <CardHeader>
            <CardTitle>Faremarkering</CardTitle>
            <CardDescription>GHS/CLP-klassifisering</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {chemical.hazardStatements && (
              <div>
                <p className="text-sm text-muted-foreground">H-setninger</p>
                <p className="font-medium whitespace-pre-wrap">{chemical.hazardStatements}</p>
              </div>
            )}

            {chemical.warningPictograms && (() => {
              try {
                const pictograms = JSON.parse(chemical.warningPictograms);
                return pictograms.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Faresymboler</p>
                    <div className="flex flex-wrap gap-3">
                      {pictograms.map((file: string, idx: number) => (
                        <div key={idx} className="relative w-20 h-20 border-2 border-orange-200 rounded-lg p-1">
                          <Image
                            src={`/faremerker/${file}`}
                            alt="Faresymbol"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              } catch {
                return null;
              }
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Personlig verneutstyr */}
      {chemical.requiredPPE && (() => {
        try {
          const ppeList = JSON.parse(chemical.requiredPPE);
          return ppeList.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Påkrevd personlig verneutstyr (PPE)</CardTitle>
                <CardDescription>ISO 7010 - Verneutstyr som må benyttes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {ppeList.map((file: string, idx: number) => (
                    <div key={idx} className="relative w-16 h-16 border-2 border-blue-200 rounded-lg p-1 bg-blue-50">
                      <Image
                        src={`/ppe/${file}`}
                        alt="PPE-krav"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null;
        } catch {
          return null;
        }
      })()}

      {/* Sikkerhetsdatablad */}
      <Card>
        <CardHeader>
          <CardTitle>Sikkerhetsdatablad (SDS)</CardTitle>
          <CardDescription>Dokumentasjon og revisjoner</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {chemical.sdsVersion && (
              <div>
                <p className="text-sm text-muted-foreground">Versjon</p>
                <p className="font-medium">{chemical.sdsVersion}</p>
              </div>
            )}

            {chemical.sdsDate && (
              <div>
                <p className="text-sm text-muted-foreground">Dato</p>
                <p className="font-medium">
                  {new Date(chemical.sdsDate).toLocaleDateString("nb-NO")}
                </p>
              </div>
            )}

            {chemical.nextReviewDate && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Neste revisjon
                </p>
                <p className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {new Date(chemical.nextReviewDate).toLocaleDateString("nb-NO")}
                  {isOverdue && " (Forfalt!)"}
                </p>
              </div>
            )}
          </div>

          {chemical.sdsKey ? (
            <div>
              <Link href={`/api/chemicals/${chemical.id}/download-sds`} target="_blank">
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Last ned sikkerhetsdatablad
                </Button>
              </Link>
            </div>
          ) : (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-800">
                  ⚠️ Sikkerhetsdatablad mangler - vennligst last opp
                </p>
              </CardContent>
            </Card>
          )}

          {chemical.lastVerifiedAt && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-800">
                  Sist verifisert: {new Date(chemical.lastVerifiedAt).toLocaleDateString("nb-NO")}
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Notater */}
      {chemical.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notater</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{chemical.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

