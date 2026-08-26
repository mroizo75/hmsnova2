import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, Pencil, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getRoutineCategoryPresets } from "@/lib/routine-categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteRoutineButton } from "@/features/routines/components/delete-routine-button";
import { fetchRoutineDetail } from "@/server/queries/routine.queries";
import { RoutineDetailContent } from "@/features/routines/components/routine-detail-content";

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
  const initialData = await fetchRoutineDetail(id);
  if (!initialData) {
    redirect("/dashboard/rutiner");
  }

  const { routine } = initialData;
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
        <div className="flex items-center gap-2">
          <DeleteRoutineButton routineId={routine.id} routineTitle={routine.title} />
          <Link href={`/dashboard/rutiner/${routine.id}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              Rediger rutine
            </Button>
          </Link>
        </div>
      </div>

      <RoutineDetailContent initialData={initialData} categoryDisplay={categoryDisplay} />
    </div>
  );
}
