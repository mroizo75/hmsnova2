import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function AnsattOpplaering() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeTrainingPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "nb-NO";

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent alle påkrevde kurs for denne tenanten
  // (Vi viser unique kurs basert på courseKey)
  const allTrainings = await prisma.training.findMany({
    where: {
      tenantId: session.user.tenantId,
      isRequired: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  // Finn unike kurs basert på courseKey
  const availableTrainings = allTrainings.filter(
    (training, index, self) =>
      index === self.findIndex((t) => t.courseKey === training.courseKey)
  );

  // Hent ansattes egne opplæringer (registrerte av ansatt selv)
  const myTrainings = await prisma.training.findMany({
    where: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
    },
    orderBy: {
      completedAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-blue-600" />
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("header.description")}
          </p>
        </div>
        <Link href="/ansatt/opplaering/ny">
          <Button>
            <GraduationCap className="h-4 w-4 mr-2" />
            {t("header.addCompetence")}
          </Button>
        </Link>
      </div>

      {/* Info om godkjenning */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>{t("approvalInfo.title")}</strong> {t("approvalInfo.description")}
          </p>
        </CardContent>
      </Card>

      {/* Påkrevd opplæring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("required.title")}</span>
            <Badge variant="destructive">{t("required.count", { count: availableTrainings.length })}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableTrainings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("required.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {availableTrainings.map((training) => {
                const hasCompleted = myTrainings.some(
                  (mt) => mt.title === training.title && mt.completedAt
                );
                
                return (
                  <div
                    key={training.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{training.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {training.description}
                        </p>
                      </div>
                    </div>
                    
                    {hasCompleted ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {t("required.completed")}
                      </Badge>
                    ) : (
                      <Link href={`/ansatt/opplaering/registrer/${training.id}`}>
                        <Button size="sm" variant="outline">
                          {t("required.register")}
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mine registrerte opplæringer */}
      <Card>
        <CardHeader>
          <CardTitle>{t("myRecords.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {myTrainings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("myRecords.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {myTrainings.map((training) => (
                <Link key={training.id} href={`/ansatt/opplaering/${training.id}`}>
                  <div className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1">{training.title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                        {training.completedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t("myRecords.completedAt", {
                              date: new Date(training.completedAt).toLocaleDateString(dateLocale),
                            })}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      {training.effectiveness === null ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {t("myRecords.pendingApproval")}
                        </Badge>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="bg-green-100 text-green-700 w-fit">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t("myRecords.approved")}
                          </Badge>
                          {training.evaluatedBy && (
                            <span className="text-xs text-muted-foreground">
                              {t("myRecords.approvedBy", { name: training.evaluatedBy })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hjelp */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("help.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <p>
            <strong>{t("help.step1.label")}</strong> {t("help.step1.text")}
          </p>
          <p>
            <strong>{t("help.step2.label")}</strong> {t("help.step2.text")}
          </p>
          <p>
            <strong>{t("help.step3.label")}</strong> {t("help.step3.text")}
          </p>
          <p>
            <strong>{t("help.step4.label")}</strong> {t("help.step4.text")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

