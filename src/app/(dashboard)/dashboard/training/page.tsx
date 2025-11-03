import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrainingForm } from "@/features/training/components/training-form";
import { TrainingList } from "@/features/training/components/training-list";
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
} from "lucide-react";
import Link from "next/link";

export default async function TrainingPage() {
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

  // Hent all opplæring med brukerinformasjon
  const trainings = await prisma.training.findMany({
    where: { tenantId },
    include: {
      tenant: {
        select: {
          users: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map trainings to include user info directly
  const trainingsWithUser = (await Promise.all(
    trainings.map(async (training) => {
      const user = await prisma.user.findUnique({
        where: { id: training.userId },
        select: { id: true, name: true, email: true },
      });
      return user ? { ...training, user } : null;
    })
  )).filter((t): t is NonNullable<typeof t> => t !== null);

  // Hent alle brukere for tenant
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
    },
  });

  // Calculate statistics
  const now = new Date();
  const completed = trainings.filter((t) => t.completedAt).length;
  const notStarted = trainings.filter((t) => !t.completedAt).length;

  const expiringSoon = trainings.filter((t) => {
    if (!t.validUntil) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(t.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;

  const expired = trainings.filter((t) => {
    if (!t.validUntil) return false;
    return new Date(t.validUntil) < now;
  }).length;

  const evaluated = trainings.filter((t) => t.effectiveness).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            Opplæring og kompetanse
          </h1>
          <p className="text-muted-foreground">
            ISO 9001 - 7.2: Dokumenter og følg opp kompetanse
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/training/matrix">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Kompetansematrise
            </Button>
          </Link>
          <TrainingForm tenantId={tenantId} users={tenantUsers} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainings.length}</div>
            <p className="text-xs text-muted-foreground">Registrerte opplæringer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fullført</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <p className="text-xs text-muted-foreground">
              {trainings.length > 0
                ? `${Math.round((completed / trainings.length) * 100)}% av totalt`
                : "0% av totalt"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utløper snart</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">Innen 30 dager</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utløpt</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expired}</div>
            <p className="text-xs text-muted-foreground">Må fornyes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluert</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{evaluated}</div>
            <p className="text-xs text-muted-foreground">
              {completed > 0
                ? `${Math.round((evaluated / completed) * 100)}% av fullført`
                : "0% av fullført"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ISO 9001 Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 ISO 9001 - 7.2 Kompetanse</CardTitle>
          <CardDescription className="text-blue-800">
            Krav til kompetansestyring
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold mb-1">a) Bestemme kompetanse:</p>
              <p>Definer nødvendig kompetanse for arbeid som påvirker kvalitet</p>
            </div>
            <div>
              <p className="font-semibold mb-1">b) Sikre kompetanse:</p>
              <p>Dokumenter utdanning, opplæring eller erfaring</p>
            </div>
            <div>
              <p className="font-semibold mb-1">c) Evaluere effektivitet:</p>
              <p>Vurder om opplæringen har gitt ønsket kompetanse</p>
            </div>
            <div>
              <p className="font-semibold mb-1">d) Dokumentert informasjon:</p>
              <p>Bevar bevis på kompetanse (sertifikater, kursbevis)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle opplæringer</CardTitle>
          <CardDescription>
            Oversikt over registrert kompetanse for alle ansatte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingList trainings={trainingsWithUser} />
        </CardContent>
      </Card>
    </div>
  );
}
