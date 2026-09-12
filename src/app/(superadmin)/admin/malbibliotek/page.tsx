import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SyncAllButton,
  SyncRoutinesButton,
  SyncFormsButton,
  SyncHrDocumentsButton,
} from "@/features/admin/components/template-library-sync-buttons";
import { getTemplateLibraryHubStatus } from "@/server/actions/template-library.actions";
import {
  FileText,
  ClipboardList,
  BookOpenCheck,
  UserCheck,
  Scale,
  BookOpen,
} from "lucide-react";

interface LibraryCardProps {
  title: string;
  icon: React.ReactNode;
  inDb: number;
  inLib?: number;
  description: string;
  syncButton?: React.ReactNode;
}

function LibraryCard({ title, icon, inDb, inLib, description, syncButton }: LibraryCardProps) {
  const isSynced = inLib !== undefined ? inDb >= inLib : true;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
        {syncButton}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold">{inDb}</p>
            <p className="text-xs text-muted-foreground">i database</p>
          </div>
          {inLib !== undefined && (
            <div>
              <p className="text-2xl font-bold">{inLib}</p>
              <p className="text-xs text-muted-foreground">i bibliotek</p>
            </div>
          )}
          <Badge variant={isSynced ? "default" : "destructive"} className="ml-auto">
            {isSynced ? "OK" : `Mangler ${(inLib ?? 0) - inDb}`}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function TemplateLibraryHubPage() {
  const result = await getTemplateLibraryHubStatus();

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Malbibliotek</CardTitle>
          <CardDescription>{result.error ?? "Kunne ikke hente status"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const s = result.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Malbibliotek</h1>
          <p className="text-muted-foreground">
            Oversikt over alle globale maler. Synkroniser fra TS-bibliotek til database.
          </p>
        </div>
        <SyncAllButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <LibraryCard
          title="Rutiner"
          icon={<BookOpenCheck className="h-5 w-5" />}
          inDb={s.routines.inDb}
          inLib={s.routines.inLib}
          description="IK-HMS § 5 — rutiner og prosedyrer"
          syncButton={<SyncRoutinesButton />}
        />

        <LibraryCard
          title="Skjema og sjekklister"
          icon={<ClipboardList className="h-5 w-5" />}
          inDb={s.forms.inDb}
          inLib={s.forms.inLib}
          description="Vernerunde, SJA, HMS-møte osv."
          syncButton={<SyncFormsButton />}
        />

        <LibraryCard
          title="Dokumentmaler"
          icon={<FileText className="h-5 w-5" />}
          inDb={s.documents.inDb}
          inLib={s.documents.hrInLib}
          description="HMS- og HR-dokumenter"
          syncButton={<SyncHrDocumentsButton />}
        />

        <LibraryCard
          title="Onboarding/offboarding"
          icon={<UserCheck className="h-5 w-5" />}
          inDb={s.boarding.tasksInLib}
          description="Oppgavebibliotek for onboarding — synkes per tenant"
        />

        <LibraryCard
          title="HMS-håndbok"
          icon={<BookOpen className="h-5 w-5" />}
          inDb={s.handbook.inDb}
          description="Bransjemaler for håndboken"
        />

        <LibraryCard
          title="Juridisk register"
          icon={<Scale className="h-5 w-5" />}
          inDb={s.legalReferences.inDb}
          description="Lovhenvisninger og forskrifter"
        />
      </div>
    </div>
  );
}
