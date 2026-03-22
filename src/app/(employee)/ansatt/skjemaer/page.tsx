import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { tenantCanUseGlobalFormTemplate } from "@/lib/form-template-industry";

export default async function AnsattSkjemaer({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeFormsPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent brukerens rolle
  const userTenant = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    },
    select: {
      role: true,
    },
  });

  const userRole = userTenant?.role || "ANSATT";
  const userId = session.user.id;
  const params = await searchParams;
  const showAll = params.view === "all";
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { industry: true },
  });

  // Hent alle aktive skjemaer (inkl. globale)
  const allForms = await prisma.formTemplate.findMany({
    where: {
      OR: [
        { tenantId: session.user.tenantId },
        { isGlobal: true },
      ],
      isActive: true,
    },
    include: {
      _count: {
        select: {
          fields: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const scopedForms = allForms.filter((form) =>
    tenantCanUseGlobalFormTemplate(form, tenant?.industry ?? null, {
      allTemplatesView: showAll,
    })
  );

  // Filtrer basert på tilgangskontroll
  const forms = scopedForms.filter((form) => {
    if (form.accessType === "ALL") {
      return true;
    }

    if (form.accessType === "ROLES" && form.allowedRoles) {
      try {
        const roles = JSON.parse(form.allowedRoles);
        return roles.includes(userRole);
      } catch {
        return false;
      }
    }

    if (form.accessType === "USERS" && form.allowedUsers) {
      try {
        const users = JSON.parse(form.allowedUsers);
        return users.includes(userId);
      } catch {
        return false;
      }
    }

    if (form.accessType === "ROLES_AND_USERS") {
      try {
        const roles = form.allowedRoles ? JSON.parse(form.allowedRoles) : [];
        const users = form.allowedUsers ? JSON.parse(form.allowedUsers) : [];
        return roles.includes(userRole) || users.includes(userId);
      } catch {
        return false;
      }
    }

    return false;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-green-600" />
          {t("header.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("header.description")}
        </p>
        <div className="mt-3">
          <Link href={showAll ? "/ansatt/skjemaer" : "/ansatt/skjemaer?view=all"}>
            <Button size="sm" variant="outline">
              {showAll ? t("header.toggleScoped") : t("header.toggleAll")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Skjemaliste */}
      <div className="space-y-3">
        {forms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t("empty")}
              </p>
            </CardContent>
          </Card>
        ) : (
          forms.map((form) => (
            <Link
              key={form.id}
              href={
                showAll
                  ? `/ansatt/skjemaer/${form.id}/fill?allTemplates=1`
                  : `/ansatt/skjemaer/${form.id}/fill`
              }
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="h-6 w-6 text-green-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1">{form.title}</h3>
                      
                      {form.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {form.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(form.category, t)}
                        </Badge>
                        
                        <span className="flex items-center gap-1">
                          {t("fieldCount", { count: form._count.fields })}
                        </span>

                        {form.requiresSignature && (
                          <Badge variant="secondary" className="text-xs">
                            {t("badges.requiresSignature")}
                          </Badge>
                        )}

                        {form.requiresApproval && (
                          <Badge variant="secondary" className="text-xs">
                            {t("badges.requiresApproval")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Info box */}
      <Card className="border-l-4 border-l-green-500 bg-green-50">
        <CardContent className="p-4">
          <p className="text-sm text-green-900">
            <strong>{t("tip.title")}</strong> {t("tip.description")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getCategoryLabel(category: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    CUSTOM: t("categories.CUSTOM"),
    MEETING: t("categories.MEETING"),
    INSPECTION: t("categories.INSPECTION"),
    INCIDENT: t("categories.INCIDENT"),
    RISK: t("categories.RISK"),
    TRAINING: t("categories.TRAINING"),
    CHECKLIST: t("categories.CHECKLIST"),
    TIMESHEET: t("categories.TIMESHEET"),
    WELLBEING: t("categories.WELLBEING"),
  };
  return labels[category] || category;
}

