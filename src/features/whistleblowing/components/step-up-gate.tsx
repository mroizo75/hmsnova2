"use client";

import { useEffect, useState } from "react";
import { hasWhistleblowStepUp } from "@/server/actions/totp.actions";
import { useSession } from "next-auth/react";
import { TotpSetup } from "@/features/whistleblowing/components/totp-setup";

export function WhistleblowStepUpGate({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);

  const check = async () => {
    if (!session?.user?.id) return;
    const verified = await hasWhistleblowStepUp(session.user.id);
    setOk(verified);
    setReady(true);
  };

  useEffect(() => {
    void check();
  }, [session?.user?.id]);

  if (!ready) {
    return <p className="p-6 text-sm text-muted-foreground">Sjekker tilgang…</p>;
  }

  if (!ok) {
    return (
      <div className="p-6">
        <TotpSetup onVerified={() => setOk(true)} />
      </div>
    );
  }

  return <>{children}</>;
}
