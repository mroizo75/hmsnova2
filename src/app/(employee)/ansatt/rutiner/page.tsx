import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpenCheck, ChevronRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listTenantRoutines } from "@/server/actions/routine.actions";
import { listRoutineUploadedDocumentsForEmployee } from "@/server/actions/routine-upload.actions";

export default async function AnsattRutinerPage() {
  const t = await getTranslations("employeeRoutinesPage");
  const [result, uploadsResult] = await Promise.all([
    listTenantRoutines(undefined, { forEmployee: true }),
    listRoutineUploadedDocumentsForEmployee(),
  ]);
  const routines = result.success && result.data ? result.data : [];
  const fileUploads = uploadsResult.success === true ? uploadsResult.data : [];

  const nothingToShow = routines.length === 0 && fileUploads.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <BookOpenCheck className="h-6 w-6 text-primary" aria-hidden />
            </span>
            {t("title")}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">{t("description")}</p>
        </div>
        <Link href="/ansatt/vernerunder" className="shrink-0">
          <Button variant="outline" size="sm">
            {t("goToInspections")}
          </Button>
        </Link>
      </div>

      {nothingToShow ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">{t("emptyAll")}</CardContent>
        </Card>
      ) : (
        <>
          <section className="space-y-4" aria-labelledby="routines-heading">
            <h2 id="routines-heading" className="text-lg font-semibold tracking-tight">
              {t("sectionRoutines")}
            </h2>
            {routines.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">{t("empty")}</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {routines.map((routine) => (
                  <Link key={routine.id} href={`/ansatt/rutiner/${routine.id}`} className="group block h-full">
                    <Card className="h-full border-2 border-transparent bg-white shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
                      <CardContent className="flex h-full min-h-[140px] flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-2">
                            {routine.category && (
                              <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                {routine.category}
                              </span>
                            )}
                            <p className="font-semibold leading-snug text-foreground group-hover:text-primary">
                              {routine.title}
                            </p>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {routine.description?.trim() ? routine.description : t("noDescription")}
                            </p>
                          </div>
                          {routine.status === "NEEDS_REVIEW" ? (
                            <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                              {t("status.needsReview")}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-4 text-sm font-medium text-primary">
                          <span>{t("readRoutine")}</span>
                          <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {fileUploads.length > 0 ? (
            <section className="space-y-4" aria-labelledby="docs-heading">
              <h2 id="docs-heading" className="text-lg font-semibold tracking-tight">
                {t("sectionDocuments")}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fileUploads.map((doc) => (
                  <Card
                    key={doc.id}
                    className="border-2 border-transparent bg-white shadow-sm transition-all hover:border-emerald-500/30 hover:shadow-md"
                  >
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                          <FileText className="h-6 w-6 text-emerald-700" aria-hidden />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold leading-snug">{doc.title}</p>
                          {doc.description ? (
                            <p className="line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
                          ) : null}
                          <p className="truncate text-xs text-muted-foreground">{doc.originalFileName}</p>
                        </div>
                      </div>
                      <Button className="w-full shrink-0 sm:w-auto" size="sm" asChild>
                        <Link href={`/api/files/${doc.fileKey}`} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-2 h-4 w-4" />
                          {t("openDocument")}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
