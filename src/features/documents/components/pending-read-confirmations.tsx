import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { BookCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pendingReadConfirmations } from "@/features/documents/lib/read-confirmation";

export async function PendingReadConfirmations({
  hrefBase,
}: {
  hrefBase: "/ansatt/dokumenter" | "/dashboard/documents";
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) return null;

  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    },
    select: { role: true },
  });
  if (!membership) return null;

  const pending = await pendingReadConfirmations({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    role: membership.role,
  });
  if (pending.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <BookCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 space-y-2">
          <div>
            <h2 className="font-semibold">Dokumenter du må kvittere for</h2>
            <p className="text-sm">
              Bekreft at du har lest dokumentet, eller at du vet hvor det ligger. Det gjelder gjeldende versjon.
            </p>
          </div>
          <ul className="space-y-1">
            {pending.map((document) => (
              <li key={document.id}>
                <Link href={`${hrefBase}/${document.id}`} className="text-sm font-medium underline">
                  {document.title}
                  <span className="font-normal"> · {document.version}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
