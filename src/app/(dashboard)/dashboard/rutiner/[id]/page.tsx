import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, Pencil, UserCircle2, CalendarClock, CalendarCheck, Tag, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getRoutineCategoryPresets } from "@/lib/routine-categories";
import { getRoutineById } from "@/server/actions/routine.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoutineStructuredBlocks } from "@/features/routines/components/routine-structured-blocks";
import { ROUTINE_DASHBOARD_CONTENT_LABELS } from "@/lib/routine-content-labels-dashboard";

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
  const categoryPresets = getRoutineCategoryPresets();
  const categoryDisplay = routine.category
    ? categoryPresets.find((p) => p.value === routine.category)?.label ?? routine.category
    : "Ikke satt";

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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{routine.title}</h1>
              {routine.updatedBy != null && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Tilpasset
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {routine.updatedBy != null
                ? "Denne rutinen er redigert og lagret som bedriftens egen versjon – malen er ikke endret."
                : routine.template?.title
                  ? `Basert på malen "${routine.template.title}"`
                  : "Egendefinert rutine"}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
            <CardDescription>Kategori</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="leading-snug">{categoryDisplay}</span>
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
            <CardDescription>Sist revidert</CardDescription>
            <CardTitle className="text-base inline-flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              {routine.lastReviewedAt
                ? new Date(routine.lastReviewedAt).toLocaleDateString("nb-NO")
                : "Ikke registrert"}
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
          <RoutineStructuredBlocks
            content={routine.content}
            labels={ROUTINE_DASHBOARD_CONTENT_LABELS}
            density="compact"
          />
        </CardContent>
      </Card>
    </div>
  );
}
