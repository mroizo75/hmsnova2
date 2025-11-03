import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRegistrationDetails } from "@/server/actions/onboarding.actions";
import { ActivateTenantForm } from "@/features/admin/components/activate-tenant-form";
import { RejectRegistrationForm } from "@/features/admin/components/reject-registration-form";
import { 
  ArrowLeft,
  Building2, 
  Calendar, 
  Mail, 
  Phone, 
  Users, 
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Registreringsdetaljer | HMS Nova Admin",
};

async function RegistrationDetails({ id }: { id: string }) {
  const result = await getRegistrationDetails(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const registration = result.data;
  const hasUsers = registration.users && registration.users.length > 0;
  const isCompleted = registration.onboardingStatus === "ADMIN_CREATED" || registration.onboardingStatus === "COMPLETED";
  const isCancelled = registration.status === "CANCELLED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/registrations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">{registration.name}</h1>
          <p className="text-muted-foreground">
            Org.nr: {registration.orgNumber || "Ikke oppgitt"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {registration.onboardingStatus === "NOT_STARTED" && (
            <Badge variant="default">Ny registrering</Badge>
          )}
          {registration.onboardingStatus === "IN_PROGRESS" && (
            <Badge variant="secondary">Behandles</Badge>
          )}
          {isCompleted && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aktivert
            </Badge>
          )}
          {isCancelled && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Avvist
            </Badge>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle>Kontaktinformasjon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Kontaktperson
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{registration.contactPerson}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      E-post
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${registration.contactEmail}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {registration.contactEmail}
                      </a>
                    </div>
                  </div>

                  {registration.contactPhone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Telefon
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`tel:${registration.contactPhone}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {registration.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(registration.address || registration.city) && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Adresse
                      </label>
                      <div className="flex items-start gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="font-medium">
                          {registration.address && <p>{registration.address}</p>}
                          {registration.postalCode && registration.city && (
                            <p>{registration.postalCode} {registration.city}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Bransje
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{registration.industry || "Ikke oppgitt"}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Antall ansatte
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{registration.employeeCount || "Ukjent"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription info */}
          {registration.subscription && (
            <Card>
              <CardHeader>
                <CardTitle>Abonnementsinformasjon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Prisnivå
                    </label>
                    <p className="font-medium mt-1">
                      {registration.pricingTier === "MICRO" && "Micro (1-20 ansatte)"}
                      {registration.pricingTier === "SMALL" && "Small (21-50 ansatte)"}
                      {registration.pricingTier === "MEDIUM" && "Medium (51+ ansatte)"}
                      {registration.pricingTier === "LARGE" && "Large (51+ ansatte)"}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Årspris
                    </label>
                    <p className="font-medium mt-1 text-primary">
                      {registration.subscription.price.toLocaleString("nb-NO")} kr
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Faktureringsinterval
                    </label>
                    <p className="font-medium mt-1">
                      {registration.subscription.billingInterval === "YEARLY" && "Årlig"}
                      {registration.subscription.billingInterval === "MONTHLY" && "Månedlig"}
                    </p>
                  </div>
                </div>

                {registration.trialEndsAt && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium text-muted-foreground">
                        Prøveperiode utløper
                      </label>
                    </div>
                    <p className="font-medium mt-1">
                      {new Date(registration.trialEndsAt).toLocaleDateString("nb-NO", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {registration.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Merknader</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{registration.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Existing users */}
          {hasUsers && (
            <Card>
              <CardHeader>
                <CardTitle>Opprettede brukere</CardTitle>
                <CardDescription>
                  Brukere som er knyttet til denne bedriften
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {registration.users.map((userTenant) => (
                    <div
                      key={userTenant.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{userTenant.user.name || "Ukjent"}</p>
                        <p className="text-sm text-muted-foreground">
                          {userTenant.user.email}
                        </p>
                      </div>
                      <Badge variant="secondary">{userTenant.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Actions */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Tidslinje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Registrert</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(registration.createdAt).toLocaleDateString("nb-NO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {registration.onboardingCompletedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Aktivert</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(registration.onboardingCompletedAt).toLocaleDateString("nb-NO", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {registration.salesRep && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Behandlet av</p>
                  <p className="text-sm font-medium">{registration.salesRep}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {!hasUsers && !isCancelled && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Aktiver tenant</CardTitle>
                  <CardDescription>
                    Opprett admin-bruker og send påloggingsinformasjon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivateTenantForm
                    tenantId={registration.id}
                    defaultEmail={registration.contactEmail || ""}
                    defaultName={registration.contactPerson || ""}
                  />
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Avvis registrering</CardTitle>
                  <CardDescription>
                    Send avvisning til kunden
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RejectRegistrationForm tenantId={registration.id} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function RegistrationDetailsPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Laster detaljer...</p>
          </CardContent>
        </Card>
      }
    >
      <RegistrationDetails id={id} />
    </Suspense>
  );
}

