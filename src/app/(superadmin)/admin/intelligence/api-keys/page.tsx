import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getApiKeys } from "@/server/actions/intelligence-api-keys.actions";
import { ApiKeyManager } from "@/features/intelligence/components/api-key-manager";
import { ArrowLeft, Key } from "lucide-react";
import Link from "next/link";

export default async function ApiKeysPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) redirect("/admin");

  const keys = await getApiKeys();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/intelligence" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Key className="h-8 w-8" />
            API-nokler
          </h1>
          <p className="text-muted-foreground mt-1">
            Administrer tilgang for eksterne kunder til Safety Intelligence API
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
        <h3 className="font-medium text-blue-900">API-dokumentasjon</h3>
        <p className="text-sm text-blue-800 mt-1">
          Base URL: <code className="bg-blue-100 px-1 rounded">/api/intelligence/v1/</code>
        </p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
          <li><code>GET /industries</code> — Liste over bransjer med datadekning</li>
          <li><code>GET /industries/:id/summary</code> — Siste snapshot for en bransje</li>
          <li><code>GET /industries/:id/trends</code> — Tidsseriedata</li>
          <li><code>GET /metrics/:metric</code> — Tverrsnitt av en metrikk</li>
          <li><code>GET /reports/quarterly</code> — Kvartalsrapport (JSON)</li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          Auth: <code className="bg-blue-100 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>
        </p>
      </div>

      <ApiKeyManager initialKeys={keys} />
    </div>
  );
}
