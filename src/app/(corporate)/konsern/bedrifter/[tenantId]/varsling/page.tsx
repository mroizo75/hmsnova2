import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupTenantWhistleblowing } from "@/server/actions/corporate-group-read.actions";

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantWhistleblowingPage({ params }: PageProps) {
  const { tenantId } = await params;
  const { channelActive } = await getGroupTenantWhistleblowing(tenantId);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Varsling</h2>
      <div className="rounded-lg border bg-amber-50/50 p-3">
        <p className="text-xs text-amber-800">
          Konsernadministrator har ingen automatisk tilgang til datterselskapenes varslingssaker.
          AML kap. 2 A og GDPR art. 5: innsyn kun etter sakbasert tildeling.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {channelActive
              ? "Varslingskanalen er aktiv. Saksinnhold er ikke tilgjengelig her."
              : "Ingen varslingskanal vises for denne bedriften."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
