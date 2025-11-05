import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar } from "lucide-react";
import Link from "next/link";

export default async function AnsattSkjemaer() {
  const session = await getServerSession(authOptions);

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

  // Hent alle aktive skjemaer
  const allForms = await prisma.formTemplate.findMany({
    where: {
      tenantId: session.user.tenantId,
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

  // Filtrer basert på tilgangskontroll
  const forms = allForms.filter((form) => {
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
          Digitale skjemaer
        </h1>
        <p className="text-muted-foreground">
          Fyll ut og signer skjemaer digitalt
        </p>
      </div>

      {/* Skjemaliste */}
      <div className="space-y-3">
        {forms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Ingen skjemaer tilgjengelig for øyeblikket
              </p>
            </CardContent>
          </Card>
        ) : (
          forms.map((form) => (
            <Link key={form.id} href={`/ansatt/skjemaer/${form.id}/fill`}>
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
                          {getCategoryLabel(form.category)}
                        </Badge>
                        
                        <span className="flex items-center gap-1">
                          {form._count.fields} felt
                        </span>

                        {form.requiresSignature && (
                          <Badge variant="secondary" className="text-xs">
                            ✍️ Krever signatur
                          </Badge>
                        )}

                        {form.requiresApproval && (
                          <Badge variant="secondary" className="text-xs">
                            ✅ Krever godkjenning
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
            <strong>💡 Tips:</strong> Trykk på et skjema for å fylle det ut. 
            Hvis skjemaet krever signatur, vil du kunne signere digitalt på slutten.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    CUSTOM: "Egendefinert",
    MEETING: "Møtereferat",
    INSPECTION: "Inspeksjon",
    INCIDENT: "Hendelsesrapport",
    RISK: "Risikovurdering",
    TRAINING: "Opplæring",
    CHECKLIST: "Sjekkliste",
  };
  return labels[category] || category;
}

