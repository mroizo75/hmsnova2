import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoutineContentEmployee } from "@/features/routines/components/routine-content-employee";
import { getRoutineById } from "@/server/actions/routine.actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AnsattRoutineDetailsPage({ params }: PageProps) {
  const t = await getTranslations("employeeRoutineDetailPage");
  const { id } = await params;
  const result = await getRoutineById(id, { forEmployee: true });

  if (!result.success || !result.data) {
    notFound();
  }

  const routine = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/ansatt/rutiner">
          <Button size="sm" variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("back")}
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="space-y-4 border-b bg-muted/30 pb-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <BookOpenCheck className="h-6 w-6 text-primary" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <CardTitle className="text-xl font-bold leading-tight sm:text-2xl">{routine.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {routine.status === "NEEDS_REVIEW" ? (
                  <Badge variant="secondary" className="font-normal">
                    {t("status.needsReview")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 font-normal text-primary">
                    {t("status.active")}
                  </Badge>
                )}
                {routine.category ? (
                  <Badge variant="outline" className="font-normal">
                    {routine.category}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          {routine.description?.trim() ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{routine.description}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <RoutineContentEmployee content={routine.content} />
          {routine.legalReference?.trim() ? (
            <p className="border-t pt-4 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{t("legalReference")}:</span>{" "}
              {routine.legalReference}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
