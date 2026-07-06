import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnsattSamtaleView } from "@/features/employee-reviews/components/ansatt-samtale-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnsattMedarbeidersamtaleDetaljPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId || !session.user.id) redirect("/login");

  const review = await prisma.employeeReview.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
      employeeId: session.user.id,
    },
    include: {
      reviewer: { select: { id: true, name: true, email: true, image: true } },
      employee: { select: { id: true, name: true, email: true, image: true } },
      goals: { orderBy: { createdAt: "asc" } },
      actions: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!review) notFound();

  return (
    <div className="space-y-4 p-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/ansatt/medarbeidersamtale">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Tilbake
        </Link>
      </Button>

      <AnsattSamtaleView
        review={JSON.parse(JSON.stringify(review))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
