import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoutineLibrarySyncButton } from "@/features/admin/components/routine-library-sync-button";
import { getRoutineLibraryStatus } from "@/server/actions/routine-library.actions";

const industryLabels: Record<string, string> = {
  all: "Felles for alle",
  construction: "Bygg og anlegg",
  healthcare: "Helse og omsorg",
  transport: "Transport og logistikk",
  manufacturing: "Industri og produksjon",
  retail: "Handel og service",
  hospitality: "Hotell og restaurant",
  education: "Utdanning",
  technology: "Teknologi og IT",
  agriculture: "Landbruk",
  other: "Annet",
};

export default async function RoutineLibraryAdminPage() {
  const statusResult = await getRoutineLibraryStatus();

  if (!statusResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rutinebibliotek</CardTitle>
          <CardDescription>{statusResult.error || "Kunne ikke hente status"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const status = statusResult.data;
  const lastSyncedText = status.lastSyncedAt
    ? new Date(status.lastSyncedAt).toLocaleString("nb-NO")
    : "Ikke synkronisert ennå";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rutinebibliotek</h1>
          <p className="text-muted-foreground">
            Synk globale rutinemaler og overvåk dekning per bransje.
          </p>
        </div>
        <RoutineLibrarySyncButton />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Maler i bibliotek</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{status.totalTemplates}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aktive i database</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{status.activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Manglende dekning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{status.missingTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Helse/status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={status.health === "HEALTHY" ? "default" : "destructive"}>
              {status.health === "HEALTHY" ? "OK" : "Mangler maler"}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">Sist synket: {lastSyncedText}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dekning per bransje</CardTitle>
          <CardDescription>
            Sammenligning mellom forventede maler i biblioteket og eksisterende globale maler.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bransje</TableHead>
                <TableHead>Forventet</TableHead>
                <TableHead>Eksisterer</TableHead>
                <TableHead>Mangler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {status.perIndustry.map((row) => (
                <TableRow key={row.industry}>
                  <TableCell>{industryLabels[row.industry] || row.industry}</TableCell>
                  <TableCell>{row.expected}</TableCell>
                  <TableCell>{row.existing}</TableCell>
                  <TableCell>
                    <Badge variant={row.missing === 0 ? "outline" : "destructive"}>
                      {row.missing}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
