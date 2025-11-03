import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TenantOnboardingForm } from "@/features/admin/components/tenant-onboarding-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionUser } from "@/types";

export default async function NewTenantPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser;

  // Kun superadmin og support har tilgang
  if (!user?.isSuperAdmin && !user?.isSupport) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tenants">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til bedrifter
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Registrer ny bedrift</h1>
        <p className="text-muted-foreground">
          CRM/Onboarding - Komplett registrering av ny kunde
        </p>
      </div>

      <TenantOnboardingForm salesRep={(user as any).name || (user as any).email} />
    </div>
  );
}

