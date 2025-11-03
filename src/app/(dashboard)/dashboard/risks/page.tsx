import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskList } from "@/features/risks/components/risk-list";
import { RiskMatrix } from "@/features/risks/components/risk-matrix";
import { Plus, AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";
import Link from "next/link";

export default async function RisksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const risks = await prisma.risk.findMany({
    where: { tenantId },
    include: {
      measures: true,
    },
    orderBy: [
      { score: "desc" },
      { createdAt: "desc" },
    ],
  });

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.score >= 20).length,
    high: risks.filter(r => r.score >= 12 && r.score < 20).length,
    medium: risks.filter(r => r.score >= 6 && r.score < 12).length,
    low: risks.filter(r => r.score < 6).length,
    open: risks.filter(r => r.status === "OPEN").length,
    mitigating: risks.filter(r => r.status === "MITIGATING").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risikovurdering</h1>
          <p className="text-muted-foreground">
            5x5 risikomatrise for systematisk vurdering av HMS-risikoer
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/risks/new">
            <Plus className="mr-2 h-4 w-4" />
            Ny risikovurdering
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registrerte risikoer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritisk/Høy</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.critical + stats.high}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.critical} kritisk, {stats.high} høy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Åpne</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Venter på håndtering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under håndtering</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mitigating}</div>
            <p className="text-xs text-muted-foreground">Tiltak pågår</p>
          </CardContent>
        </Card>
      </div>

      <RiskMatrix risks={risks} />

      <div>
        <h2 className="text-xl font-semibold mb-4">Alle risikoer</h2>
        <RiskList risks={risks} />
      </div>
    </div>
  );
}
