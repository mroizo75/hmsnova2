import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listTenantRoutines } from "@/server/actions/routine.actions";

function getStatusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const labels: Record<string, string> = {
    ACTIVE: t("status.active"),
    DRAFT: t("status.draft"),
    ARCHIVED: t("status.archived"),
  };
  return labels[status] ?? status;
}

export default async function AnsattRutinerPage() {
  const t = await getTranslations("employeeRoutinesPage");
  const result = await listTenantRoutines();
  const routines = result.success && result.data ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpenCheck className="h-7 w-7 text-primary" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link href="/ansatt/skjemaer">
          <Button variant="outline" size="sm">
            {t("goToForms")}
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {routines.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("empty")}
            </CardContent>
          </Card>
        ) : (
          routines.map((routine) => (
            <Link key={routine.id} href={`/ansatt/rutiner/${routine.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{routine.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {routine.description || t("noDescription")}
                    </p>
                  </div>
                  <Badge variant="outline">{getStatusLabel(routine.status, t)}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
