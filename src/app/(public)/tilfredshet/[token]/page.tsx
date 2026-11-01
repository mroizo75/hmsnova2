import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SatisfactionForm } from "@/features/feedback/components/satisfaction-form";

export const dynamic = "force-dynamic";

export default async function SatisfactionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const survey = await prisma.satisfactionSurvey.findUnique({
    where: { token },
    include: { tenant: { select: { name: true } } },
  });
  if (!survey || !survey.active) notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold">Hvordan var opplevelsen?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {survey.tenant.name} ber om en kort vurdering. Navn og e-post er frivillig.
      </p>
      <SatisfactionForm token={token} />
    </div>
  );
}
