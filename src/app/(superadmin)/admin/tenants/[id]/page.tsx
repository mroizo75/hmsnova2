import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getTenantDetails,
  getTenantIndustryPackageStatus,
  toggleTenantStatus,
} from "@/server/actions/tenant.actions";
import { EditTenantForm } from "@/features/admin/components/edit-tenant-form";
import { UpdateAdminEmailForm } from "@/features/admin/components/update-admin-email-form";
import { ResendActivationForm } from "@/features/admin/components/resend-activation-form";
import { DeleteTenantDialog } from "@/features/admin/components/delete-tenant-dialog";
import { TenantActivityTimeline } from "@/features/admin/components/tenant-activity-timeline";
import { TenantOfferCard } from "@/features/admin/components/tenant-offer-card";
import { IndustryPackageActions } from "@/features/admin/components/industry-package-actions";
import { KursavtaleCard } from "@/features/admin/components/kursavtale-card";
import { GdprExportButton } from "@/features/admin/components/gdpr-export-button";
import { BreakGlassRequestCard } from "@/features/whistleblowing/components/break-glass-request-card";
import { HandbookTemplateImport } from "@/features/admin/components/handbook-template-import";
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
  FileText,
  ShieldAlert,
  TrendingUp,
  CreditCard,
  Boxes,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Bedriftsdetaljer | HMS Nova Admin",
};

async function TenantDetails({ id }: { id: string }) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isSuperAdmin: true },
      })
    : null;
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;

  const result = await getTenantDetails(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const tenant = result.data;
  const adminUser = tenant.users.find((ut) => ut.role === "ADMIN")?.user;
  const hasSubscription = !!tenant.subscription;
  const lastManagementReview = tenant.managementReviews?.[0];
  const packageStatusResult = await getTenantIndustryPackageStatus(tenant.id);
  const packageStatus = packageStatusResult.success ? packageStatusResult.data : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/tenants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">{tenant.name}</h1>
          <p className="text-muted-foreground">
            {tenant.slug} • Org.nr: {tenant.orgNumber || "Ikke oppgitt"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              tenant.status === "ACTIVE"
                ? "default"
                : tenant.status === "TRIAL"
                ? "secondary"
                : "destructive"
            }
          >
            {tenant.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {tenant.status === "SUSPENDED" && <AlertCircle className="h-3 w-3 mr-1" />}
            {tenant.status === "CANCELLED" && <AlertCircle className="h-3 w-3 mr-1" />}
            {tenant.status}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{tenant._count.users}</p>
                    <p className="text-xs text-muted-foreground">Brukere</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{tenant._count.documents}</p>
                    <p className="text-xs text-muted-foreground">Dokumenter</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{tenant._count.incidents}</p>
                    <p className="text-xs text-muted-foreground">Avvik</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{tenant._count.risks}</p>
                    <p className="text-xs text-muted-foreground">Risikoer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenant Info - kun synlig for superadmin */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Bedriftsinformasjon</CardTitle>
                <CardDescription>
                  Grunnleggende informasjon om bedriften
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EditTenantForm tenant={tenant} />
              </CardContent>
            </Card>
          )}

          {/* Årlig HMS-plan / Ledelsens gjennomgang */}
          <Card>
            <CardHeader>
              <CardTitle>Årlig HMS-plan</CardTitle>
              <CardDescription>
                Konfigurasjon for årlig HMS-plan og ledelsens gjennomgang for denne bedriften
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Årlig HMS-plan
                  </p>
                  <p className="mt-1 font-medium">
                    {tenant.hmsAnnualPlanEnabled ? "Aktivert" : "Deaktivert"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Frekvens ledelsens gjennomgang
                  </p>
                  <p className="mt-1 font-medium">
                    Hver {tenant.managementReviewFrequencyMonths} måned
                    {tenant.managementReviewFrequencyMonths !== 1 ? "er" : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Siste gjennomgang
                  </p>
                  <p className="mt-1 font-medium">
                    {lastManagementReview
                      ? format(new Date(lastManagementReview.reviewDate), "d. MMM yyyy", { locale: nb })
                      : "Ingen registrert"}
                  </p>
                </div>
              </div>
              {lastManagementReview && (
                <p className="text-xs text-muted-foreground">
                  Neste anbefalte ledelsens gjennomgang beregnes automatisk ut fra valgt frekvens
                  og brukes i varslingsmotoren for denne tenanten.
                </p>
              )}
            </CardContent>
          </Card>

          {isSuperAdmin && (
            <>
              <TenantActivityTimeline tenantId={tenant.id} activities={tenant.activities || []} />
              <TenantOfferCard tenant={tenant} />
            </>
          )}

          {/* Subscription Info */}
          {hasSubscription && (
            <Card>
              <CardHeader>
                <CardTitle>Abonnement</CardTitle>
                <CardDescription>
                  Abonnementsinformasjon og fakturering
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Plan
                    </label>
                    <p className="font-medium mt-1">{tenant.subscription.plan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Pris
                    </label>
                    <p className="font-medium mt-1 text-primary">
                      {tenant.subscription.price.toLocaleString("nb-NO")} kr
                      <span className="text-sm text-muted-foreground">
                        /{tenant.subscription.billingInterval === "YEARLY" ? "år" : "mnd"}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <div className="font-medium mt-1">
                      <Badge variant={tenant.subscription.status === "ACTIVE" ? "default" : "secondary"}>
                        {tenant.subscription.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {tenant.subscription.currentPeriodEnd && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium text-muted-foreground">
                        Periode utløper
                      </label>
                    </div>
                    <p className="font-medium mt-1">
                      {new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString("nb-NO", {
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

          {/* Recent Invoices - kun superadmin */}
          {isSuperAdmin && tenant.invoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Siste fakturaer</CardTitle>
                <CardDescription>
                  De {tenant.invoices.length} siste fakturaene
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenant.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {invoice.amount.toLocaleString("nb-NO")} kr
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.createdAt).toLocaleDateString("nb-NO")}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          invoice.status === "PAID"
                            ? "default"
                            : invoice.status === "OVERDUE"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users - kun superadmin (persondata) */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Brukere ({tenant.users.length})</CardTitle>
                <CardDescription>
                  Alle brukere tilknyttet denne bedriften
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenant.users.map((userTenant) => (
                    <div
                      key={userTenant.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{userTenant.user.name || "Ukjent"}</p>
                        <p className="text-sm text-muted-foreground">
                          {userTenant.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Opprettet: {new Date(userTenant.user.createdAt).toLocaleDateString("nb-NO")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {userTenant.user.emailVerified && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verifisert
                          </Badge>
                        )}
                        <Badge variant="secondary">{userTenant.role}</Badge>
                      </div>
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
                    {new Date(tenant.createdAt).toLocaleDateString("nb-NO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {tenant.onboardingCompletedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Aktivert</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tenant.onboardingCompletedAt).toLocaleDateString("nb-NO", {
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

              {tenant.trialEndsAt && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Prøveperiode utløper</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tenant.trialEndsAt).toLocaleDateString("nb-NO", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Update Admin Email - kun superadmin */}
          {isSuperAdmin && adminUser && (
            <Card>
              <CardHeader>
                <CardTitle>Endre admin e-post</CardTitle>
                <CardDescription>
                  Oppdater e-postadressen til admin-brukeren
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpdateAdminEmailForm
                  tenantId={tenant.id}
                  currentEmail={adminUser.email}
                />
              </CardContent>
            </Card>
          )}

          {/* Resend Activation - kun superadmin */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Send aktivering på nytt</CardTitle>
                <CardDescription>
                  Send ny aktiverings-e-post med påloggingsinformasjon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResendActivationForm
                  tenantId={tenant.id}
                  defaultEmail={adminUser?.email || tenant.contactEmail || ""}
                />
              </CardContent>
            </Card>
          )}

          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                Bransjepakke-status
              </CardTitle>
              <CardDescription>
                Oversikt over hva som er provisionert for valgt bransje
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!packageStatusResult.success && (
                <p className="text-sm text-destructive">{packageStatusResult.error}</p>
              )}

              {packageStatus?.hasPackage === false && (
                <p className="text-sm text-muted-foreground">
                  Ingen definert bransjepakke for denne tenanten
                  {packageStatus.industryLabel ? ` (${packageStatus.industryLabel})` : ""}.
                </p>
              )}

              {packageStatus?.hasPackage && (
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Bransje: </span>
                    <span className="font-medium">{packageStatus.industryLabel}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Risikovurdering-forslag</span>
                      <Badge variant="outline">
                        {packageStatus.sections.risks.existing}/{packageStatus.sections.risks.expected}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SJA-maler</span>
                      <Badge variant="outline">
                        {packageStatus.sections.sjaTemplates.existing}/{packageStatus.sections.sjaTemplates.expected}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Vernerunde-maler</span>
                      <Badge variant="outline">
                        {packageStatus.sections.inspectionTemplates.existing}/{packageStatus.sections.inspectionTemplates.expected}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Opplæringsmaler</span>
                      <Badge variant="outline">
                        {packageStatus.sections.courses.existing}/{packageStatus.sections.courses.expected}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Lovreferanser</span>
                      <Badge variant="outline">
                        {packageStatus.sections.legalReferences.existing}/{packageStatus.sections.legalReferences.expected}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Enkel mobilmeny</span>
                      <Badge variant="outline">
                        {packageStatus.sections.simpleMenu.existing}/{packageStatus.sections.simpleMenu.expected}
                      </Badge>
                    </div>
                  </div>

                  <IndustryPackageActions
                    tenantId={tenant.id}
                    hasPackage={packageStatus.hasPackage}
                  />

                  <p className="text-xs text-muted-foreground">
                    Provisionering er idempotent og oppretter kun manglende elementer.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* HMS-hånbok oppsett */}
          <HandbookTemplateImport
            tenantId={tenant.id}
            tenantName={tenant.name}
            tenantIndustry={tenant.industry}
            orgNumber={tenant.orgNumber}
            adminName={adminUser?.name}
          />

          {/* Bransjekurs.no kursavtale */}
          <KursavtaleCard
            tenantId={tenant.id}
            tenantName={tenant.name}
            bransjekursEnabled={tenant.bransjekursEnabled}
            bransjekursActivatedAt={tenant.bransjekursActivatedAt}
            bransjekursLastSyncAt={tenant.bransjekursLastSyncAt}
            userCount={tenant._count.users}
          />

          {/* GDPR-eksport - kun superadmin */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Dataeksport (GDPR)</CardTitle>
                <CardDescription>
                  Last ned all data for denne bedriften iht. GDPR art. 20
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GdprExportButton tenantId={tenant.id} />
              </CardContent>
            </Card>
          )}

          <BreakGlassRequestCard tenantId={tenant.id} />

          {/* Status Actions - kun superadmin */}
          {isSuperAdmin && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Administrer status</CardTitle>
                <CardDescription>
                  Endre bedriftens status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {tenant.status !== "ACTIVE" && (
                  <form action={async () => {
                    "use server";
                    await toggleTenantStatus(tenant.id, "ACTIVE");
                  }}>
                    <Button type="submit" variant="default" className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aktiver bedrift
                    </Button>
                  </form>
                )}
                {tenant.status !== "SUSPENDED" && (
                  <form action={async () => {
                    "use server";
                    await toggleTenantStatus(tenant.id, "SUSPENDED");
                  }}>
                    <Button type="submit" variant="outline" className="w-full">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Suspender bedrift
                    </Button>
                  </form>
                )}
                {tenant.status !== "CANCELLED" && (
                  <form action={async () => {
                    "use server";
                    await toggleTenantStatus(tenant.id, "CANCELLED");
                  }}>
                    <Button type="submit" variant="destructive" className="w-full">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Kanseller bedrift
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Delete Tenant - kun superadmin */}
          {isSuperAdmin && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Fare-sone</CardTitle>
                <CardDescription>
                  Slett bedrift og alle tilhørende data permanent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteTenantDialog
                  tenantId={tenant.id}
                  tenantName={tenant.name}
                  tenantStatus={tenant.status}
                  counts={{
                    users: tenant._count.users,
                    documents: tenant._count.documents,
                    incidents: tenant._count.incidents,
                    risks: tenant._count.risks,
                  }}
                />
                {(tenant.status === "ACTIVE" || tenant.status === "TRIAL") && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Endre status til SUSPENDED eller CANCELLED for sletting
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function TenantDetailsPage({ params }: PageProps) {
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
      <TenantDetails id={id} />
    </Suspense>
  );
}

