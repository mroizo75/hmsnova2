import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { FormFiller } from "@/components/shared/form-filler";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ runde?: string }>;
}

export default async function WellbeingFillPage({ params, searchParams }: PageProps) {
  const { formId } = await params;
  const { runde } = await searchParams;
  const session = await getServerSession(authOptions);
  const t = await getTranslations("dashboardWellbeingPage");

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  const formTemplate = await prisma.formTemplate.findFirst({
    where: {
      id: formId,
      category: "WELLBEING",
      OR: [
        { tenantId },
        { isGlobal: true },
      ],
    },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!formTemplate) {
    notFound();
  }

  const activeRounds = await prisma.wellbeingRound.findMany({
    where: { tenantId, formTemplateId: formId, status: "ACTIVE" },
    select: { id: true },
  });
  const recipientRows = activeRounds.length
    ? await prisma.wellbeingRoundRecipient.findMany({
        where: {
          userId,
          roundId: { in: activeRounds.map((round) => round.id) },
        },
        select: { roundId: true, status: true },
      })
    : [];
  const recipient = runde
    ? recipientRows.find((row) => row.roundId === runde)
    : recipientRows.find((row) => row.status === "PENDING") ?? recipientRows[0];

  if (activeRounds.length > 0 && !recipient) {
    return (
      <div className="mx-auto max-w-lg space-y-2 py-10">
        <h1 className="text-2xl font-bold">Kartleggingen er ikke sendt til deg</h1>
        <p className="text-muted-foreground">
          Administrator, HR eller HMS velger hvem som skal svare. Svarene som sendes inn, lagres uten navn.
        </p>
      </div>
    );
  }

  if (recipient?.status === "ANSWERED") {
    return (
      <div className="mx-auto max-w-lg space-y-2 py-10">
        <h1 className="text-2xl font-bold">Du har svart</h1>
        <p className="text-muted-foreground">Svaret er lagret uten navn.</p>
      </div>
    );
  }

  const form = {
    id: formTemplate.id,
    title: formTemplate.title,
    description: formTemplate.description ?? undefined,
    requiresSignature: formTemplate.requiresSignature,
    requiresApproval: formTemplate.requiresApproval,
    isAnonymous: true,
    fields: formTemplate.fields.map((field) => ({
      id: field.id,
      type: field.fieldType,
      label: field.label,
      placeholder: field.placeholder ?? undefined,
      helpText: field.helpText ?? undefined,
      isRequired: field.isRequired,
      options: field.options ? JSON.parse(field.options as string) : undefined,
    })),
  };

  return (
    <FormFiller
      form={form}
      userId={userId}
      tenantId={tenantId}
      roundId={recipient?.roundId}
      returnUrl="/dashboard/wellbeing"
    />
  );
}
