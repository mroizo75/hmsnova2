import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { GoalList } from "@/features/goals/components/goal-list";

export default async function GoalsPage() {
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

  // Hent alle mål
  const goals = await prisma.goal.findMany({
    where: { tenantId },
    include: {
      measurements: {
        orderBy: { measurementDate: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Statistikk
  const stats = {
    total: goals.length,
    active: goals.filter((g) => g.status === "ACTIVE").length,
    achieved: goals.filter((g) => g.status === "ACHIEVED").length,
    atRisk: goals.filter((g) => g.status === "AT_RISK").length,
    failed: goals.filter((g) => g.status === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mål og KPIer</h1>
          <p className="text-muted-foreground">
            ISO 9001 - 6.2 Kvalitetsmål og planlegging
          </p>
        </div>
        <Link href="/dashboard/goals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nytt mål
          </Button>
        </Link>
      </div>

      {/* ISO 9001 Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">
                ISO 9001 - 6.2 Kvalitetsmål
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Organisasjonen skal etablere kvalitetsmål på relevante nivåer</li>
                <li>Målene skal være målbare og overvåkbare</li>
                <li>Målene skal være i samsvar med kvalitetspolitikken</li>
                <li>Fremgang mot mål skal dokumenteres og kommuniseres</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">mål</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">pågående</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oppnådd</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.achieved}</div>
            <p className="text-xs text-muted-foreground">fullført</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">I risiko</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.atRisk}</div>
            <p className="text-xs text-muted-foreground">krever handling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ikke oppnådd</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">avsluttet</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle mål</CardTitle>
          <CardDescription>Oversikt over kvalitetsmål og KPIer</CardDescription>
        </CardHeader>
        <CardContent>
          <GoalList goals={goals} />
        </CardContent>
      </Card>
    </div>
  );
}
