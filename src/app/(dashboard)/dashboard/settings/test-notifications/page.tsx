import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmailTestPanel } from "@/features/settings/components/email-test-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Mail, TestTube, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TestNotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = selectedMembership.tenantId;
  const tenant = selectedMembership.tenant;

  // Hent alle brukere i tenant for testing
  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: {
        some: { tenantId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      notifyByEmail: true,
      notifyBySms: true,
      phone: true,
    },
  });

  // Sjekk om Resend er konfigurert
  const isResendConfigured = !!process.env.RESEND_API_KEY;

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til innstillinger
        </Link>
      </Button>

      <div className="flex items-center gap-3">
        <TestTube className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Test E-postvarslinger</h1>
          <p className="text-muted-foreground">
            Send test-e-poster for å verifisere at varslingssystemet fungerer
          </p>
        </div>
      </div>

      {!isResendConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Resend ikke konfigurert</AlertTitle>
          <AlertDescription>
            RESEND_API_KEY er ikke satt i miljøvariablene. E-poster vil ikke bli sendt.
            <br />
            Legg til <code className="bg-muted px-1 py-0.5 rounded">RESEND_API_KEY=din_api_key</code> i .env-filen.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>E-postkonfigu rasjon</CardTitle>
              <CardDescription>
                Nåværende e-postoppsett for {tenant.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fra-adresse</p>
              <p className="text-sm font-mono">
                {process.env.RESEND_FROM_EMAIL ?? "noreply@hmsnova.no"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-sm">
                {isResendConfigured ? (
                  <span className="text-green-600 font-medium">✓ Konfigurert</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Ikke konfigurert</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Antall brukere</p>
              <p className="text-sm">{tenantUsers.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aktive e-postvarsler</p>
              <p className="text-sm">
                {tenantUsers.filter((u) => u.notifyByEmail).length} av {tenantUsers.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <EmailTestPanel
        currentUser={user}
        tenantUsers={tenantUsers}
        tenantId={tenantId}
        tenantName={tenant.name}
      />
    </div>
  );
}
