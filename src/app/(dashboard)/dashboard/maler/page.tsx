import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchGlobalTemplatesForTenant } from "@/server/actions/template-library.actions";
import { TemplateHubContent } from "@/features/templates/components/template-hub-content";

export default async function TemplateLibraryPage() {
  const t = await getTranslations("dashboardTemplateLibraryPage");
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const result = await fetchGlobalTemplatesForTenant();

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>Kunne ikke laste maler.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { routines, forms, documents, tenantIndustry } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <TemplateHubContent
        routines={routines}
        forms={forms}
        documents={documents}
        tenantIndustry={tenantIndustry}
      />
    </div>
  );
}
