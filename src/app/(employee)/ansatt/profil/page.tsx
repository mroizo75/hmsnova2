import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, FlaskConical, AlertTriangle, Info, Download } from "lucide-react";
import Link from "next/link";
import { ProfileForm } from "@/components/ansatt/profile-form";

const EXPOSURE_TYPE_LABELS: Record<string, string> = {
  INHALATION: "Innånding",
  SKIN: "Hudkontakt",
  NOISE: "Støy",
  VIBRATION: "Vibrasjon",
  BIOLOGICAL: "Biologisk",
  RADIATION: "Stråling",
  OTHER: "Annet",
};

export default async function AnsattProfil() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, exposureEntries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        tenants: {
          include: {
            tenant: { select: { name: true } },
          },
          select: {
            id: true,
            role: true,
            department: true,
            employeeNumber: true,
            tenant: { select: { name: true } },
          },
        },
      },
    }),
    prisma.exposureRegister.findMany({
      where: {
        employeeId: session.user.id,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        exposureAgent: true,
        exposureType: true,
        exposureStartDate: true,
        exposureEndDate: true,
        ppeUsed: true,
        healthCheckRequired: true,
        healthCheckDone: true,
        healthCheckDate: true,
        retentionUntilDate: true,
        status: true,
        chemical: { select: { productName: true, casNumber: true } },
      },
      orderBy: { exposureStartDate: "desc" },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <User className="h-7 w-7 text-primary" />
          Min profil
        </h1>
        <p className="text-muted-foreground">
          Administrer din profil og kontaktinformasjon
        </p>
      </div>

      {/* Profilbilde og info */}
      <Card>
        <CardHeader>
          <CardTitle>Profilinformasjon</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      {/* Bedriftsinformasjon */}
      <Card>
        <CardHeader>
          <CardTitle>Bedriftsinformasjon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user.tenants.map((ut) => (
              <div key={ut.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="space-y-0.5">
                  <p className="font-medium">{ut.tenant.name}</p>
                  <p className="text-sm text-muted-foreground">Rolle: {ut.role}</p>
                  {ut.department && (
                    <p className="text-xs text-muted-foreground">Avdeling: {ut.department}</p>
                  )}
                  {ut.employeeNumber && (
                    <p className="text-xs text-muted-foreground">
                      Ansattnr.: <span className="font-mono font-medium text-foreground">{ut.employeeNumber}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eksponeringsregister */}
      <Card className={exposureEntries.length > 0 ? "border-orange-200" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <FlaskConical className={`h-5 w-5 ${exposureEntries.length > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              <div>
                <CardTitle className="text-base">Eksponeringsregister</CardTitle>
                <CardDescription>
                  Dine registrerte eksponeringer for helseskadelige stoffer og faktorer
                </CardDescription>
              </div>
            </div>
            {exposureEntries.length > 0 && (
              <Link href="/api/exposure-register/my-exposure/pdf" target="_blank">
                <Button size="sm" variant="outline" className="gap-2 border-orange-300 text-orange-800 hover:bg-orange-50">
                  <Download className="h-4 w-4" />
                  Last ned PDF
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {exposureEntries.length === 0 ? (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Du er ikke registrert i eksponeringsregisteret. Har du spørsmål om dette, ta kontakt med din HMS-ansvarlig.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-800">
                  Du er registrert i eksponeringsregisteret. Disse opplysningene oppbevares i{" "}
                  {Math.max(...exposureEntries.map((e) => e.retentionUntilDate.getFullYear()))} og kan
                  brukes som dokumentasjon ved eventuell yrkessykdom.
                </p>
              </div>

              <div className="space-y-3">
                {exposureEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 bg-white space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-sm">
                          {entry.chemical?.productName ?? entry.exposureAgent}
                        </p>
                        {entry.chemical?.casNumber && (
                          <p className="text-xs text-muted-foreground font-mono">
                            CAS: {entry.chemical.casNumber}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          entry.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-gray-100 text-gray-700 border-gray-200"
                        }
                      >
                        {entry.status === "ACTIVE" ? "Pågående" : "Avsluttet"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Type:{" "}
                        <span className="text-foreground">
                          {EXPOSURE_TYPE_LABELS[entry.exposureType] ?? entry.exposureType}
                        </span>
                      </span>
                      <span>
                        Fra:{" "}
                        <span className="text-foreground">
                          {entry.exposureStartDate.toLocaleDateString("nb-NO")}
                        </span>
                      </span>
                      {entry.exposureEndDate && (
                        <span>
                          Til:{" "}
                          <span className="text-foreground">
                            {entry.exposureEndDate.toLocaleDateString("nb-NO")}
                          </span>
                        </span>
                      )}
                      {entry.ppeUsed && (
                        <span className="col-span-2">
                          Verneutstyr: <span className="text-foreground">{entry.ppeUsed}</span>
                        </span>
                      )}
                    </div>

                    {entry.healthCheckRequired && (
                      <div
                        className={`text-xs rounded px-2 py-1 ${
                          entry.healthCheckDone
                            ? "bg-green-50 text-green-800"
                            : "bg-yellow-50 text-yellow-800"
                        }`}
                      >
                        {entry.healthCheckDone
                          ? `Helsekontroll gjennomført${entry.healthCheckDate ? ": " + entry.healthCheckDate.toLocaleDateString("nb-NO") : ""}`
                          : "Helsekontroll er påkrevd – ikke gjennomført ennå"}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Oppbevares til: {entry.retentionUntilDate.toLocaleDateString("nb-NO")}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Har du spørsmål om registreringene? Kontakt din HMS-ansvarlig. Du har rett til innsyn i egne opplysninger etter arbeidsmiljøloven.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

