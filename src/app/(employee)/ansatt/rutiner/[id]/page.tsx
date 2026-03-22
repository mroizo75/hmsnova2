import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRoutineById } from "@/server/actions/routine.actions";

function getStatusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const labels: Record<string, string> = {
    ACTIVE: t("status.active"),
    DRAFT: t("status.draft"),
    ARCHIVED: t("status.archived"),
  };
  return labels[status] ?? status;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AnsattRoutineDetailsPage({ params }: PageProps) {
  const t = await getTranslations("employeeRoutineDetailPage");
  const { id } = await params;
  const result = await getRoutineById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const routine = result.data;
  const content =
    typeof routine.content === "string"
      ? routine.content
      : JSON.stringify(routine.content ?? {}, null, 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ansatt/rutiner">
          <Button size="sm" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-primary" />
            {routine.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{getStatusLabel(routine.status, t)}</Badge>
            {routine.category && <Badge variant="secondary">{routine.category}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {routine.description && (
            <p className="text-sm text-muted-foreground">{routine.description}</p>
          )}
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
            {content}
          </pre>
          {routine.legalReference && (
            <p className="text-xs text-muted-foreground">
              {t("legalReference")}: {routine.legalReference}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
