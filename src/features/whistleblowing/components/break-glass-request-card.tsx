"use client";

import { useState } from "react";
import { requestBreakGlassAccess, fetchBreakGlassStatusForTenant } from "@/server/actions/whistleblowing-break-glass.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function BreakGlassRequestCard({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState("");
  const [caseId, setCaseId] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nødinnsyn i varsling</CardTitle>
        <CardDescription>
          SuperAdmin og support har ingen ordinær innsynstilgang. Nødinnsyn krever kundens
          godkjenning, tidsfrist, 2FA og full logging. Oppgi saks-ID når innsynet gjelder én sak.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="break-glass-case">Saks-ID (valgfritt)</Label>
          <Input
            id="break-glass-case"
            placeholder="Intern saks-ID"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
          />
        </div>
        <Textarea
          placeholder="Formål med innsynet"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
        <Button
          disabled={busy || !purpose.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await requestBreakGlassAccess({
                tenantId,
                purpose,
                whistleblowingId: caseId.trim() || null,
              });
              toast({ title: "Forespørsel sendt til varslingsansvarlig" });
              setPurpose("");
              setCaseId("");
              await fetchBreakGlassStatusForTenant(tenantId);
            } catch (err) {
              toast({
                title: "Ikke sendt",
                description: err instanceof Error ? err.message : "Feil",
                variant: "destructive",
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          Be om nødinnsyn
        </Button>
      </CardContent>
    </Card>
  );
}
