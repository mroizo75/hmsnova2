"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { CheckCircle2, AlertCircle, Link2 } from "lucide-react";
import {
  connectTripletex,
  disconnectTripletex,
  saveTripletexMapping,
  mapTenantEmployee,
  refreshTripletexCatalog,
} from "@/server/actions/accounting.actions";

type Activity = { externalId: string; name: string; number?: string | null };
type Product = { externalId: string; name: string; number?: string | null; unit?: string | null };
type Employee = {
  userId: string;
  name: string | null;
  email: string;
  employeeNumber: string | null;
  externalEmployeeId: string | null;
};

interface TripletexIntegrationProps {
  isAdmin: boolean;
  connected: boolean;
  consumerConfigured?: boolean;
  applicationName?: string;
  companyId?: string | null;
  lastPullAt?: Date | string | null;
  mapping: {
    activityNormalId?: string | null;
    activityOt50Id?: string | null;
    activityOt100Id?: string | null;
    productKmId?: string | null;
    productKmNonTaxableId?: string | null;
    productMachineHoursId?: string | null;
    absenceProjectId?: string | null;
    absencePayrollTypes?: string[] | null;
  };
  activities: Activity[];
  products: Product[];
  employees: Employee[];
  txEmployees: Array<{ externalId: string; firstName?: string | null; lastName?: string | null; email?: string | null }>;
  projects?: Array<{ id: string; name: string }>;
}

export function TripletexIntegration({
  isAdmin,
  connected,
  consumerConfigured = false,
  applicationName = "HMS Nova",
  companyId,
  lastPullAt,
  mapping,
  activities,
  products,
  employees,
  txEmployees,
  projects = [],
}: TripletexIntegrationProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const tAbsence = useTranslations("timesheet.absence");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapState, setMapState] = useState(mapping);

  useEffect(() => {
    setMapState(mapping);
  }, [connected, companyId, lastPullAt]);

  async function reloadSettings() {
    await queryClient.invalidateQueries({ queryKey: ["accounting-settings"] });
    router.refresh();
  }

  async function handleConnect() {
    setLoading(true);
    const res = await connectTripletex(token);
    if (!res.success) {
      setLoading(false);
      toast({ title: "Kunne ikke koble til", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Koblet til Tripletex", description: res.data.companyName ?? res.data.companyId });
    setToken("");
    await reloadSettings();
    setLoading(false);
  }

  async function handleDisconnect() {
    setLoading(true);
    const res = await disconnectTripletex();
    if (!res.success) {
      setLoading(false);
      toast({ title: "Feil", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Frakoblet Tripletex" });
    await reloadSettings();
    setLoading(false);
  }

  async function handleSaveMapping() {
    setLoading(true);
    const res = await saveTripletexMapping(mapState);
    setLoading(false);
    if (!res.success) {
      toast({ title: "Feil", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Innstillingene er lagret" });
    await reloadSettings();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Tripletex
            </CardTitle>
            <CardDescription>
              Kommersiell integrasjon «{applicationName}» mot Tripletex API 2.0.
              Administrator limer inn virksomhetens employee token. Tokenet lagres kryptert
              og brukes bare for denne bedriften.
            </CardDescription>
          </div>
          {connected ? (
            <Badge className="border border-green-300 bg-green-50 text-green-800">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Koblet
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-transparent">
              <AlertCircle className="mr-1 h-3 w-3" />
              Ikke koblet
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!connected && (
          <div className="space-y-3">
            {consumerConfigured ? (
              <p className="text-sm text-muted-foreground">
                Integrasjonen {applicationName} er klar på serveren. Lim inn{" "}
                <strong>employee token</strong> for testkontoen (ikke consumer-tokenet som ligger i
                .env). Testkonto treffer Tripletex sitt testmiljø automatisk. Se{" "}
                <a
                  href="https://developer.tripletex.no/docs/documentation/authentication-and-tokens/"
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Tripletex-dokumentasjonen
                </a>
                .
              </p>
            ) : (
              <p className="text-sm text-destructive">
                Consumer-token fra Tripletex mangler på serveren. Integrasjonen kan ikke
                kobles før det er lagt inn.
              </p>
            )}
            <Label htmlFor="tx-token">Employee token (selskapseid integrasjonsnøkkel fra Tripletex)</Label>
            <Input
              id="tx-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={!isAdmin || loading || !consumerConfigured}
              placeholder="Lim inn token"
            />
            <Button
              onClick={handleConnect}
              disabled={!isAdmin || loading || !consumerConfigured || token.length < 8}
            >
              {loading ? "Kobler til…" : "Koble til Tripletex"}
            </Button>
          </div>
        )}

        {connected && (
          <>
            <p className="text-sm text-muted-foreground">
              Selskap {companyId}
              {lastPullAt
                ? ` · Sist oppdatert ${new Date(lastPullAt).toLocaleString("nb-NO")}`
                : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              className="bg-transparent"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const res = await refreshTripletexCatalog();
                setLoading(false);
                if (!res.success) {
                  toast({ title: "Kunne ikke hente", description: res.error, variant: "destructive" });
                  return;
                }
                toast({ title: "Produkter og kunder er oppdatert" });
                await reloadSettings();
              }}
            >
              {loading ? "Henter…" : "Hent produkter og kunder på nytt"}
            </Button>

            <p className="text-sm font-medium">Hvordan timer og kjøring skal føres</p>
            <p className="text-xs text-muted-foreground">
              Velg hvilke aktiviteter og produkter i Tripletex som skal brukes. Dette styrer faktura og lønn.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Ordinær tid"
                value={mapState.activityNormalId ?? ""}
                onChange={(v) => setMapState((s) => ({ ...s, activityNormalId: v || null }))}
                options={activities.map((a) => ({ value: a.externalId, label: a.name }))}
              />
              <SelectField
                label="Overtid 50 %"
                value={mapState.activityOt50Id ?? ""}
                onChange={(v) => setMapState((s) => ({ ...s, activityOt50Id: v || null }))}
                options={activities.map((a) => ({ value: a.externalId, label: a.name }))}
              />
              <SelectField
                label="Overtid 100 %"
                value={mapState.activityOt100Id ?? ""}
                onChange={(v) => setMapState((s) => ({ ...s, activityOt100Id: v || null }))}
                options={activities.map((a) => ({ value: a.externalId, label: a.name }))}
              />
              <SelectField
                label="Km-tillegg skattbar"
                value={mapState.productKmId ?? ""}
                onChange={(v) => setMapState((s) => ({ ...s, productKmId: v || null }))}
                options={products.map((p) => ({ value: p.externalId, label: p.name }))}
              />
              <SelectField
                label="Km-tillegg ikke skattbar"
                value={mapState.productKmNonTaxableId ?? ""}
                onChange={(v) => setMapState((s) => ({ ...s, productKmNonTaxableId: v || null }))}
                options={products.map((p) => ({ value: p.externalId, label: p.name }))}
              />
              <SelectField
                label="Maskintimer (produkt)"
                value={mapState.productMachineHoursId ?? ""}
                onChange={(v) => setMapState((s) => ({ ...s, productMachineHoursId: v || null }))}
                options={products.map((p) => ({ value: p.externalId, label: p.name }))}
              />
              <SelectField
                label="Fraværsprosjekt (uten helsedata)"
                value={mapState.absenceProjectId ?? ""}
                onChange={(v) => setMapState((s) => ({ ...s, absenceProjectId: v || null }))}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Fraværstyper som skal til lønn</p>
              <p className="text-xs text-muted-foreground">
                Huk av det som skal sendes til lønn. Ingen avkrysning betyr alle unntatt avspasering.
              </p>
              {(
                [
                  "SELF_CERTIFIED",
                  "SICK_LEAVE",
                  "CARE_DAYS",
                  "VACATION",
                  "COMPENSATORY",
                  "LEAVE_OF_ABSENCE",
                  "PARENTAL_LEAVE",
                  "BEREAVEMENT",
                  "MILITARY",
                  "OTHER",
                ] as const
              ).map((type) => {
                const selected = mapState.absencePayrollTypes ?? [];
                const checked = selected.includes(type);
                return (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, type]
                          : selected.filter((v) => v !== type);
                        setMapState((s) => ({ ...s, absencePayrollTypes: next }));
                      }}
                    />
                    {tAbsence(`types.${type}`)}
                  </label>
                );
              })}
            </div>
            <Button onClick={handleSaveMapping} disabled={!isAdmin || loading} variant="outline" className="bg-transparent">
              Lagre innstillinger
            </Button>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Ansatte i Tripletex</h3>
              {employees.map((emp) => (
                <div key={emp.userId} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {emp.name ?? emp.email}
                  </span>
                  <select
                    className="h-9 rounded-md border bg-transparent px-2 text-sm"
                    value={emp.externalEmployeeId ?? ""}
                    disabled={!isAdmin}
                    onChange={async (e) => {
                      const res = await mapTenantEmployee(emp.userId, e.target.value);
                      if (!res.success) {
                        toast({ title: "Feil", description: res.error, variant: "destructive" });
                      } else {
                        await reloadSettings();
                      }
                    }}
                  >
                    <option value="">Ikke koblet</option>
                    {txEmployees.map((tx) => (
                      <option key={tx.externalId} value={tx.externalId}>
                        {[tx.firstName, tx.lastName].filter(Boolean).join(" ") || tx.email || tx.externalId}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="bg-transparent text-destructive"
              onClick={handleDisconnect}
              disabled={!isAdmin || loading}
            >
              Koble fra
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Velg…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
