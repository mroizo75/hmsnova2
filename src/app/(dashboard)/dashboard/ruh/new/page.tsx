import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileWarning } from "lucide-react";
import Link from "next/link";
import { DashboardRuhForm } from "@/components/ruh/dashboard-ruh-form";

export default async function NewRuhPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!session.user.tenantId) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/ruh" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileWarning className="h-7 w-7 text-amber-600" />
            Registrer RUH-rapport
          </h1>
          <p className="text-muted-foreground">
            Rapport om uønsket hendelse
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RUH-skjema</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardRuhForm
            tenantId={session.user.tenantId}
            reportedBy={session.user.name || session.user.email || "Ukjent"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
