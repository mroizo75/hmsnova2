import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemSettingsForm } from "@/features/admin/components/system-settings-form";
import { EmailSettingsForm } from "@/features/admin/components/email-settings-form";
import { StorageSettingsForm } from "@/features/admin/components/storage-settings-form";
import { PaymentSettingsForm } from "@/features/admin/components/payment-settings-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;

  // Kun superadmin har tilgang
  if (!user?.isSuperAdmin) {
    redirect("/admin");
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Systeminnstillinger</h1>
        <p className="text-muted-foreground">
          Konfigurer system, e-post, lagring og betalingstjenester
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="email">E-post</TabsTrigger>
          <TabsTrigger value="storage">Lagring</TabsTrigger>
          <TabsTrigger value="payment">Betaling</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>Systeminnstillinger</CardTitle>
              <CardDescription>
                Generelle innstillinger for HMS Nova
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemSettingsForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>E-postinnstillinger</CardTitle>
              <CardDescription>
                Konfigurer Resend for transaksjonelle e-poster
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailSettingsForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>Lagringsinnstillinger</CardTitle>
              <CardDescription>
                Konfigurer Cloudflare R2 eller S3 for fillagring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StorageSettingsForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Betalingsinnstillinger</CardTitle>
              <CardDescription>
                Konfigurer Fiken API for fakturering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSettingsForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

