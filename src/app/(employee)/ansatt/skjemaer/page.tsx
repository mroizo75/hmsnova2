import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default async function AnsattSkjemaer() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-green-600" />
          Digitale skjemaer
        </h1>
        <p className="text-muted-foreground">
          Fyll ut og signer skjemaer digitalt
        </p>
      </div>

      {/* Kommer snart */}
      <Card>
        <CardContent className="text-center py-16">
          <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Kommer snart!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Snart kan du fylle ut og signere skjemaer digitalt direkte fra telefonen.
            Vi varsler deg når funksjonen er klar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

