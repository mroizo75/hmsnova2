import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Clock } from "lucide-react";
import Link from "next/link";

export default async function AnsattDokumenter() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  // Hent godkjente dokumenter
  const documents = await prisma.document.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "APPROVED", // Kun godkjente dokumenter for ansatte
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">📄 Dokumenter</h1>
        <p className="text-muted-foreground">
          HMS-dokumenter og prosedyrer du har tilgang til
        </p>
      </div>

      {/* Dokumentliste */}
      <div className="space-y-3">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Ingen dokumenter tilgjengelig ennå
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
                          {doc.kind === "LAW" && "⚖️ Lov/Forskrift"}
                          {doc.kind === "PROCEDURE" && "📋 Prosedyre"}
                          {doc.kind === "CHECKLIST" && "✅ Sjekkliste"}
                          {doc.kind === "FORM" && "📝 Skjema"}
                          {doc.kind === "SDS" && "⚠️ Sikkerhetsdatablad"}
                          {doc.kind === "PLAN" && "📊 Plan"}
                          {doc.kind === "OTHER" && "📄 Annet"}
                        </Badge>
                        
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {doc.version}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          ✓ Godkjent
                        </Badge>
                        {doc.approvedBy && (
                          <span className="text-xs text-muted-foreground">
                            av {doc.approvedBy}
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
            <strong>💡 Tips:</strong> Trykk på et dokument for å lese det eller laste det ned.
            Alle dokumenter er godkjent og oppdatert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

