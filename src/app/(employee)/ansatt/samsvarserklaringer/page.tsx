import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plug } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getElectroForEmployee } from "@/server/actions/electro.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const parsed = d instanceof Date ? d : new Date(d);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("nb-NO");
}

export default async function AnsattElektroPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const result = await getElectroForEmployee();
  if (result.success === false) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Plug className="h-6 w-6" />
          Elektro
        </h1>
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    );
  }

  const { compliance } = result.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Plug className="h-6 w-6 text-amber-600" />
          Elektro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Samsvarserklæringer fra arbeidsgiver. Trykk «Åpne dokument» for å lese eller laste ned. Andre rutinefiler
          finner du under Rutiner.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Samsvarserklæringer</h2>
        {compliance.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Ingen samsvarserklæringer er lagt inn ennå.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {compliance.map((row) => (
              <Card key={row.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <CardDescription>
                    Utført: {formatDate(row.workCompletedAt)}
                    {row.contractorName ? ` · ${row.contractorName}` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 pt-0">
                  <Button variant="default" size="sm" asChild>
                    <Link href={`/api/files/${row.fileKey}`} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-1" />
                      Åpne dokument
                    </Link>
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">{row.originalFileName}</span>
                </CardContent>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
