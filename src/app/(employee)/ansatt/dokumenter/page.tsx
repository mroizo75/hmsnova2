import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Clock } from "lucide-react";
import Link from "next/link";

export default async function AnsattDokumenter() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("employeeDocumentsPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent brukerens rolle for denne tenanten
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

  // Hent alle godkjente dokumenter for denne tenanten
  const allDocuments = await prisma.document.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "APPROVED", // Kun godkjente dokumenter for ansatte
    },
    include: {
      approvedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 200, // Hent flere for å kunne filtrere
  });

  // Filtrer basert på roller i JavaScript (siden JSON-filtering i Prisma er komplisert)
  const documents = allDocuments.filter((doc) => {
    if (!doc.visibleToRoles) {
      // Ingen rolle-restriksjoner = synlig for alle
      return true;
    }
    try {
      const roles = typeof doc.visibleToRoles === "string" 
        ? JSON.parse(doc.visibleToRoles) 
        : doc.visibleToRoles;
      
      if (!Array.isArray(roles) || roles.length === 0) {
        // Tom array eller ikke en array = synlig for alle
        return true;
      }
      
      // Sjekk om brukerens rolle er i listen
      return roles.includes(userRole);
    } catch (error) {
      console.error("Feil ved parsing av visibleToRoles:", error);
      return true; // Vis dokumentet hvis det er feil i dataene
    }
  }).slice(0, 50); // Begrens til 50 dokumenter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">{t("header.title")}</h1>
        <p className="text-muted-foreground">
          {t("header.description")}
        </p>
      </div>

      {/* Dokumentliste */}
      <div className="space-y-3">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t("empty")}
              </p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Link key={doc.id} href={`/ansatt/dokumenter/${doc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold mb-1 truncate">
                        {doc.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Badge variant="outline" className="text-xs">
                          {doc.kind === "LAW" && t("kind.LAW")}
                          {doc.kind === "PROCEDURE" && t("kind.PROCEDURE")}
                          {doc.kind === "CHECKLIST" && t("kind.CHECKLIST")}
                          {doc.kind === "FORM" && t("kind.FORM")}
                          {doc.kind === "SDS" && t("kind.SDS")}
                          {doc.kind === "PLAN" && t("kind.PLAN")}
                          {doc.kind === "OTHER" && t("kind.OTHER")}
                        </Badge>
                        
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {doc.version}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          {t("approvedBadge")}
                        </Badge>
                        {doc.approvedByUser && (
                          <span className="text-xs text-muted-foreground">
                            {t("approvedBy", { name: doc.approvedByUser.name || doc.approvedByUser.email || "" })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action icons */}
                    <div className="flex flex-col gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-primary" />
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
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>{t("tip.title")}</strong> {t("tip.description")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

