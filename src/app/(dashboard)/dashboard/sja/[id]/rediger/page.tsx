import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchSjaDetail } from "@/server/queries/sja.queries";
import { canCorrectSubmittedSja } from "@/features/sja/lib/sja-submission";
import { SjaCorrectionForm } from "@/features/sja/components/sja-correction-form";

export default async function CorrectSjaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await fetchSjaDetail(id);
  if (!analysis) notFound();
  if (!analysis.canApproveSja || !canCorrectSubmittedSja(analysis.status)) {
    redirect(`/dashboard/sja/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sja/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Rett SJA</h1>
          {analysis.sjaNummer && (
            <p className="font-mono text-sm text-muted-foreground">{analysis.sjaNummer}</p>
          )}
        </div>
      </div>
      <SjaCorrectionForm analysis={analysis} />
    </div>
  );
}
