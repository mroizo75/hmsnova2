import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SupplierPublicAssessmentForm } from "@/features/suppliers/components/supplier-public-assessment-form";
import { legacySupplierQuestions, parseSupplierQuestions } from "@/lib/supplier-management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Selvevaluering",
};

export default async function SupplierAssessmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const assessment = await prisma.supplierAssessment.findUnique({
    where: { token },
    include: {
      tenant: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });
  if (!assessment || assessment.status === "CANCELLED") notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold">Selvevaluering</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {assessment.tenant.name} ber {assessment.supplier.name} bekrefte leveransen. Svarfristen er{" "}
        {assessment.dueAt.toLocaleDateString("nb-NO")}.
      </p>
      {assessment.status === "SENT" ? (
        <>
          <section className="mt-6 space-y-3 text-sm">
            <div>
              <h2 className="font-medium">Krav til leveransen</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">{assessment.requirementsSnapshot}</p>
            </div>
            <div>
              <h2 className="font-medium">Oppfølging</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">{assessment.controlsSnapshot}</p>
            </div>
          </section>
          <SupplierPublicAssessmentForm
            token={token}
            questions={parseSupplierQuestions(assessment.questionsSnapshot) ?? legacySupplierQuestions(assessment.worksOnSite)}
          />
        </>
      ) : (
        <p className="mt-8 text-sm">Svaret er allerede registrert.</p>
      )}
    </div>
  );
}
