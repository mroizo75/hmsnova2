import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasKonsernMenuInHms } from "@/lib/konsern-access";
import { getMessagesForTenant } from "@/server/actions/corporate-group-messages.actions";
import { TenantMessageCard } from "@/features/konsern/components/konsern-messages-banner";

export const dynamic = "force-dynamic";

export default async function DashboardKonsernMessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !hasKonsernMenuInHms({
      corporateGroupId: session.user.corporateGroupId,
      tenantRole: session.user.role,
    })
  ) {
    redirect("/dashboard");
  }

  const messages = await getMessagesForTenant();
  const unread = messages.filter((m) => !m.isRead);
  const read = messages.filter((m) => m.isRead);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meldinger</h1>
        <p className="text-muted-foreground">
          Meldinger fra konsernet. Når du kvitterer ut en melding, forsvinner den fra dashboardet.
        </p>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen meldinger fra konsernet.</p>
      ) : (
        <>
          {unread.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">
                Nye ({unread.length})
              </h2>
              {unread.map((msg) => (
                <TenantMessageCard key={msg.id} msg={msg} showAcknowledge />
              ))}
            </section>
          )}

          {read.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Kvittert ut
              </h2>
              {read.map((msg) => (
                <TenantMessageCard key={msg.id} msg={msg} showAcknowledge={false} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
