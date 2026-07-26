"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MoreHorizontal, RefreshCw, Ban, Rocket, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  subscription: {
    id: string;
    tenantId: string;
    status: string;
    plan: string;
    endsAt: string;
    isStandalone: boolean; // isTavleOnly fra tenant
  };
}

export function SuperadminTavleActions({ subscription }: Props) {
  const router = useRouter();
  const [renewOpen, setRenewOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [renewMonths, setRenewMonths] = useState(3);
  const [loading, setLoading] = useState(false);

  async function handleRenew() {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/hms-tavle/${subscription.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: renewMonths }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Feil");
      toast.success(`Abonnement fornyet med ${renewMonths} måneder`);
      setRenewOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Er du sikker på at du vil kansellere dette abonnementet?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/hms-tavle/${subscription.id}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Feil");
      toast.success("Abonnement kansellert");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/superadmin/hms-tavle/${subscription.id}/upgrade-to-hmsnova`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Feil");
      toast.success(json.data?.message ?? "Oppgradert til HMS Nova!");
      setUpgradeOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Handlinger
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setRenewOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Forny abonnement
          </DropdownMenuItem>
          {subscription.isStandalone && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-blue-700 focus:text-blue-700 focus:bg-blue-50"
                onClick={() => setUpgradeOpen(true)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Oppgrader til HMS Nova
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleCancel}
          >
            <Ban className="h-4 w-4 mr-2" />
            Kanseller
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Forny-dialog ── */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forny abonnement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Nåværende utløpsdato:{" "}
              {new Date(subscription.endsAt).toLocaleDateString("nb-NO")}
            </p>
            <div className="space-y-1.5">
              <Label>Antall måneder å forlenge</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={renewMonths}
                onChange={(e) => setRenewMonths(Number(e.target.value))}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Ny utløpsdato:{" "}
              {(() => {
                const d = new Date(subscription.endsAt);
                d.setMonth(d.getMonth() + renewMonths);
                return d.toLocaleDateString("nb-NO");
              })()}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)}>Avbryt</Button>
            <Button onClick={handleRenew} disabled={loading}>
              {loading ? "Fornyer..." : "Forny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Oppgrader til HMS Nova-dialog ── */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-blue-600" />
              Oppgrader til HMS Nova
            </DialogTitle>
            <DialogDescription>
              Kunden får umiddelbart tilgang til full HMS Nova. Tavlen konverteres til add-on.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-900">Hva som skjer:</p>
              {[
                { from: "Standalone tavle", to: "HMS Nova Starter + Tavle Add-on" },
                { from: "isTavleOnly: true", to: "isTavleOnly: false (full tilgang)" },
                { from: `Plan: ${subscription.plan}`, to: "Plan: ADDON (kr 290/mnd)" },
              ].map((row) => (
                <div key={row.from} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs shrink-0">{row.from}</Badge>
                  <ArrowRight className="h-3 w-3 text-blue-400 shrink-0" />
                  <Badge className="text-xs bg-blue-600 shrink-0">{row.to}</Badge>
                </div>
              ))}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1.5">
              <p className="text-sm font-semibold text-green-900">Kunden beholder:</p>
              {[
                "All eksisterende tavle-data og seksjoner",
                "QR-koder og lenker (ingen endring)",
                "Kontaktpersoner og konfigurasjoner",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-green-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Etter oppgradering kan kunden koble tavlen til et HMS Nova-prosjekt for å aktivere
              live-data (SHA-plan, avvik, mannskapsliste).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)} disabled={loading}>
              Avbryt
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleUpgrade}
              disabled={loading}
            >
              <Rocket className="h-4 w-4 mr-2" />
              {loading ? "Oppgraderer..." : "Oppgrader nå"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
