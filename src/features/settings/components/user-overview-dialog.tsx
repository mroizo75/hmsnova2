"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchUserOverview } from "@/server/queries/users.queries";
import { getRoleDisplayName } from "@/lib/permissions";
import type { Role } from "@prisma/client";

type Overview = NonNullable<Awaited<ReturnType<typeof fetchUserOverview>>>;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

interface UserOverviewDialogProps {
  userId: string | null;
  onClose: () => void;
}

export function UserOverviewDialog({ userId, onClose }: UserOverviewDialogProps) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setOverview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchUserOverview(userId)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Dialog open={userId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{overview?.name || "Bruker"}</DialogTitle>
          <DialogDescription>
            Kontakt og personalopplysninger, inkludert pårørende.
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Henter opplysninger...</p>}

        {!loading && !overview && (
          <p className="text-sm text-muted-foreground">Kunne ikke hente brukeren.</p>
        )}

        {overview && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-post" value={overview.email} />
              <Field label="Telefon" value={overview.phone} />
              <Field label="Rolle" value={getRoleDisplayName(overview.role as Role)} />
              <Field label="Ansattnr." value={overview.employeeNumber} />
              <Field label="Stilling" value={overview.position} />
              <Field label="Avdeling" value={overview.department} />
              <Field label="Nærmeste leder" value={overview.managerName} />
              <Field label="Ansatt fra" value={formatDate(overview.startedAt)} />
              <Field label="Fødselsdato" value={formatDate(overview.dateOfBirth)} />
              <Field label="Nasjonalitet" value={overview.nationality} />
              <Field label="Arbeidsspråk" value={overview.languages.join(", ")} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Pårørende</p>
              {overview.nextOfKin.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen pårørende er registrert.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {overview.nextOfKin.map((kin, index) => (
                    <div key={`${kin.name}-${index}`} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{kin.name}</p>
                      <p className="text-muted-foreground">{kin.relation || "Relasjon ikke oppgitt"}</p>
                      <p>{kin.phone || "Ingen telefon"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {overview.showHrNotes && (
              <div>
                <p className="text-sm font-medium">HR-notat</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {overview.hrNotes?.trim() || "Ingen notat."}
                </p>
              </div>
            )}

            {overview.canOpenPersonnelFolder && (
              <Button variant="outline" className="bg-transparent" asChild>
                <Link href={`/dashboard/personalarkiv/${userId}`}>Åpne personalmappe</Link>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
