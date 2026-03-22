import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardHat, BookTemplate, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SjaTemplateActions } from "@/components/sja/sja-template-actions";

export default async function AnsattSjaMaler() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeSjaTemplatesPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const templates = await prisma.sjaTemplate.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
    },
    include: {
      hazards: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ansatt/sja" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <BookTemplate className="h-7 w-7 text-purple-600" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </div>

      <Card className="border-l-4 border-l-purple-500 bg-purple-50">
        <CardContent className="p-4">
          <p className="text-sm text-purple-900">
            <strong>{t("dailyUse.title")}</strong> {t("dailyUse.description")}
          </p>
        </CardContent>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookTemplate className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
            <p className="text-muted-foreground">
              {t("empty.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <HardHat className="h-5 w-5 text-orange-500" />
                      {template.name}
                    </CardTitle>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <SjaTemplateActions templateId={template.id} templateName={template.name} />
                </div>
              </CardHeader>
              <CardContent>
                {template.workLocation && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("workLocation", { value: template.workLocation })}
                  </p>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {template.hazards.length === 1
                      ? t("hazards.definedSingle", { count: template.hazards.length })
                      : t("hazards.definedMultiple", { count: template.hazards.length })}
                  </p>
                  <div className="grid gap-2">
                    {template.hazards.map((hazard) => (
                      <div
                        key={hazard.id}
                        className="flex items-start gap-3 p-2 bg-muted/50 rounded text-sm"
                      >
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {hazard.activity}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{hazard.hazard}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t("hazards.measures", { value: hazard.measures })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
