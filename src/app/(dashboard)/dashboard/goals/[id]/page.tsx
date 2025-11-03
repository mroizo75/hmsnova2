import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, TrendingUp, ListTodo, User, Calendar } from "lucide-react";
import Link from "next/link";
import { GoalProgressCard } from "@/features/goals/components/goal-progress-card";
import { MeasurementForm } from "@/features/goals/components/measurement-form";
import { MeasurementList } from "@/features/goals/components/measurement-list";
import {
  getCategoryLabel,
  getCategoryColor,
  getStatusLabel,
  getStatusColor,
} from "@/features/goals/schemas/goal.schema";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const goal = await prisma.goal.findUnique({
    where: { id, tenantId },
    include: {
      measurements: {
        orderBy: { measurementDate: "desc" },
      },
      actions: {
        where: { goalId: id },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!goal) {
    notFound();
  }

  const owner = await prisma.user.findUnique({
    where: { id: goal.ownerId },
  });

  const categoryLabel = getCategoryLabel(goal.category);
  const categoryColor = getCategoryColor(goal.category);
  const statusLabel = getStatusLabel(goal.status);
  const statusColor = getStatusColor(goal.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/goals">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til mål
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{goal.title}</h1>
              <Badge className={categoryColor}>{categoryLabel}</Badge>
              <Badge className={statusColor}>{statusLabel}</Badge>
            </div>
            <p className="text-muted-foreground">
              {goal.description || "Ingen beskrivelse"}
            </p>
          </div>
          <Link href={`/dashboard/goals/${goal.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Rediger
            </Button>
          </Link>
        </div>
      </div>

      {/* Goal Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <GoalProgressCard goal={goal} />

        <Card>
          <CardHeader>
            <CardTitle>Måldetaljer</CardTitle>
            <CardDescription>Informasjon om målet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kategori</p>
                <Badge className={categoryColor}>{categoryLabel}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusColor}>{statusLabel}</Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Ansvarlig
              </p>
              <p className="font-medium">{owner?.name || owner?.email || "Ukjent"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Periode
                </p>
                <p className="font-medium">
                  {goal.year}
                  {goal.quarter && ` Q${goal.quarter}`}
                </p>
              </div>
              {goal.deadline && (
                <div>
                  <p className="text-sm text-muted-foreground">Frist</p>
                  <p className="font-medium">
                    {new Date(goal.deadline).toLocaleDateString("nb-NO")}
                  </p>
                </div>
              )}
            </div>

            {goal.startDate && (
              <div>
                <p className="text-sm text-muted-foreground">Startdato</p>
                <p className="font-medium">
                  {new Date(goal.startDate).toLocaleDateString("nb-NO")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Measurements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                KPI-målinger
              </CardTitle>
              <CardDescription>
                ISO 9001 - 9.1: Overvåking og måling
              </CardDescription>
            </div>
            <MeasurementForm
              goalId={goal.id}
              goalTitle={goal.title}
              unit={goal.unit}
              userId={user.id}
            />
          </div>
        </CardHeader>
        <CardContent>
          <MeasurementList measurements={goal.measurements} unit={goal.unit} />
        </CardContent>
      </Card>

      {/* Related Actions */}
      {goal.actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Tilknyttede tiltak
            </CardTitle>
            <CardDescription>
              Tiltak som er koblet til dette målet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goal.actions.map((action) => (
                <Link
                  key={action.id}
                  href={`/dashboard/actions/${action.id}`}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{action.title}</p>
                    <Badge>{action.status}</Badge>
                  </div>
                  {action.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {action.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

