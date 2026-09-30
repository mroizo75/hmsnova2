import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { SjaAcknowledgeButton } from "@/components/sja/sja-acknowledge-button";
import { Card, CardContent } from "@/components/ui/card";
import { SjaDetailContent } from "@/features/sja/components/sja-detail-content";
import { authOptions } from "@/lib/auth";
import { fetchSjaDetail } from "@/server/queries/sja.queries";

interface EmployeeSjaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeSjaDetailPage({ params }: EmployeeSjaDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const analysis = await fetchSjaDetail(id);
  if (!analysis) notFound();

  const myParticipation = analysis.participantRecords.find(
    (participant: { userId: string | null }) => participant.userId === session.user.id,
  );
  const acknowledgedCurrentVersion = Boolean(
    myParticipation?.acknowledgedAt &&
      myParticipation.acknowledgedVersion &&
      new Date(myParticipation.acknowledgedVersion).getTime() ===
        new Date(analysis.contentVersion).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ansatt/sja" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{analysis.title}</h1>
          <p className="font-mono text-sm text-muted-foreground">{analysis.sjaNummer}</p>
        </div>
      </div>

      {myParticipation && (
        <Card className={myParticipation.acknowledgedAt ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}>
          <CardContent className="p-4">
            {acknowledgedCurrentVersion ? (
              <p className="flex items-center gap-2 text-sm font-medium text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                Bekreftet {new Date(myParticipation.acknowledgedAt).toLocaleString("nb-NO")}
              </p>
            ) : (
              <SjaAcknowledgeButton analysisId={analysis.id} />
            )}
          </CardContent>
        </Card>
      )}

      <SjaDetailContent initialData={analysis} history={[]} />
    </div>
  );
}
