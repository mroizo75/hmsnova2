import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, Pencil, UserCircle2, CalendarClock } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getRoutineById } from "@/server/actions/routine.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Aktiv",
    DRAFT: "Kladd",
    NEEDS_REVIEW: "Krever revisjon",
    ARCHIVED: "Arkivert",
  };

  return labels[status] || status;
}

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getRoutineById(id);
  if (!result.success) {
    redirect("/dashboard/rutiner");
  }

  const routine = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/rutiner">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{routine.title}</h1>
            <p className="text-muted-foreground mt-1">
              Opprettet fra {routine.template?.title ? `"${routine.template.title}"` : "egendefinert mal"}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/rutiner/${routine.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            Rediger rutine
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-lg">
              <Badge variant={routine.status === "ACTIVE" ? "default" : "outline"}>
                {statusLabel(routine.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ansvarlig</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              {routine.responsibleUser?.name || routine.responsibleUser?.email || "Ikke satt"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Neste revisjon</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              {routine.nextReviewAt
                ? new Date(routine.nextReviewAt).toLocaleDateString("nb-NO")
                : "Ikke satt"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beskrivelse</CardTitle>
        </CardHeader>
        <CardContent className="text-sm whitespace-pre-wrap">
          {routine.description || "Ingen beskrivelse"}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Innhold</CardTitle>
          <CardDescription>
            Lovforankring: {routine.legalReference || "Ikke satt"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
            {JSON.stringify(routine.content || {}, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
