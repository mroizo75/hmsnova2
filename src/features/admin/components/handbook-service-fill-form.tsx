"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, CheckCircle2, Loader2, Upload } from "lucide-react";
import { applyHandbookTemplateToTenants } from "@/server/actions/hms-handbok.actions";
import { getAvailableTemplates } from "@/lib/handbook-templates";

export type HandbookFillTenant = {
  id: string;
  name: string;
  orgNumber: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  industry: string | null;
  contactPerson: string | null;
  hmsContactName: string | null;
};

export type HandbookFillGroup = {
  id: string;
  name: string;
  tenantIds: string[];
};

function formatAddress(tenant: HandbookFillTenant): string {
  return [tenant.address, [tenant.postalCode, tenant.city].filter(Boolean).join(" ")]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
}

interface HandbookServiceFillFormProps {
  tenants: HandbookFillTenant[];
  groups?: HandbookFillGroup[];
  lockedTenantId?: string;
  initialGroupId?: string;
  initialTenantIds?: string[];
}

export function HandbookServiceFillForm({
  tenants,
  groups = [],
  lockedTenantId,
  initialGroupId,
  initialTenantIds,
}: HandbookServiceFillFormProps) {
  const templates = getAvailableTemplates();
  const lockedTenant = lockedTenantId
    ? tenants.find((tenant) => tenant.id === lockedTenantId)
    : undefined;

  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId ?? "");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>(() => {
    if (lockedTenantId) return [lockedTenantId];
    if (initialTenantIds && initialTenantIds.length > 0) return initialTenantIds;
    if (initialGroupId) {
      return groups.find((group) => group.id === initialGroupId)?.tenantIds ?? [];
    }
    return [];
  });
  const [selectedTemplate, setSelectedTemplate] = useState(
    lockedTenant?.industry ?? "",
  );
  const [shared, setShared] = useState({
    dagligLeder: lockedTenant?.contactPerson ?? "",
    hmsAnsvarlig: lockedTenant?.hmsContactName ?? "",
    verneombud: "",
    brannvernleder: "",
  });
  const [overrides, setOverrides] = useState<Record<string, { bedriftsnavn: string; orgNummer: string; adresse: string }>>({});
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const selectedTenants = useMemo(
    () => tenants.filter((tenant) => selectedTenantIds.includes(tenant.id)),
    [tenants, selectedTenantIds],
  );

  const bransjeLabel = templates
    .find((template) => template.industry === selectedTemplate)
    ?.name.replace("HMS-hånbok – ", "") ?? "";

  const toggleTenant = (tenantId: string, checked: boolean) => {
    setSelectedTenantIds((current) =>
      checked ? [...new Set([...current, tenantId])] : current.filter((id) => id !== tenantId),
    );
  };

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = groups.find((item) => item.id === groupId);
    if (group) {
      setSelectedTenantIds(group.tenantIds.filter((id) => tenants.some((tenant) => tenant.id === id)));
    }
  };

  const identityFor = (tenant: HandbookFillTenant) => {
    const override = overrides[tenant.id];
    return {
      bedriftsnavn: override?.bedriftsnavn ?? tenant.name,
      orgNummer: override?.orgNummer ?? tenant.orgNumber ?? "",
      adresse: override?.adresse ?? formatAddress(tenant),
    };
  };

  const handleApply = () => {
    if (!selectedTemplate || selectedTenantIds.length === 0) return;

    startTransition(async () => {
      const perTenantOverrides: Record<string, Record<string, string>> = {};
      for (const tenant of selectedTenants) {
        const identity = identityFor(tenant);
        perTenantOverrides[tenant.id] = {
          ...identity,
          bransje: bransjeLabel,
        };
      }

      const res = await applyHandbookTemplateToTenants({
        tenantIds: selectedTenantIds,
        industryKey: selectedTemplate,
        sharedVariables: {
          dagligLeder: shared.dagligLeder,
          hmsAnsvarlig: shared.hmsAnsvarlig,
          verneombud: shared.verneombud,
          brannvernleder: shared.brannvernleder,
          bransje: bransjeLabel,
        },
        perTenantOverrides,
      });

      if (res.success === false || !res.results) {
        setResult({ success: false, message: res.success === false ? res.error : "Ukjent feil" });
        return;
      }

      const ok = res.results.filter((item) => item.success).length;
      const failed = res.results.filter((item) => !item.success);
      setResult({
        success: failed.length === 0,
        message:
          failed.length === 0
            ? `Utkast opprettet i ${ok} bedrift${ok === 1 ? "" : "er"}.`
            : `${ok} ok, ${failed.length} feilet: ${failed[0]?.error ?? "ukjent feil"}`,
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          HMS-håndbok som tjeneste
        </CardTitle>
        <CardDescription>
          Fyll bransjemal og roller. Hver bedrift får eget utkast med sitt navn, org.nr og adresse.
          Bedriften må selv godkjenne og signere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!lockedTenantId && groups.length > 0 && (
          <div className="space-y-2">
            <Label>Konsern (valgfritt)</Label>
            <Select
              value={selectedGroupId || "__none__"}
              onValueChange={(value) => {
                if (value === "__none__") {
                  setSelectedGroupId("");
                  return;
                }
                selectGroup(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg konsern..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ingen konsern</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.tenantIds.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!lockedTenantId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Bedrifter</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-transparent"
                onClick={() => setSelectedTenantIds(tenants.map((tenant) => tenant.id))}
              >
                Velg alle
              </Button>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
              {tenants.map((tenant) => (
                <label key={tenant.id} className="flex cursor-pointer items-start gap-2 text-sm">
                  <Checkbox
                    checked={selectedTenantIds.includes(tenant.id)}
                    onCheckedChange={(checked) => toggleTenant(tenant.id, checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{tenant.name}</span>
                    {tenant.orgNumber && (
                      <span className="ml-2 text-muted-foreground">{tenant.orgNumber}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedTenantIds.length} valgt
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Bransjemal</Label>
          <Select
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
          >
            <SelectTrigger>
              <SelectValue placeholder="Velg bransje..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.industry} value={template.industry}>
                  <div className="flex items-center gap-2">
                    <span>{template.name}</span>
                    {lockedTenant?.industry === template.industry && (
                      <Badge variant="secondary" className="text-xs">
                        Anbefalt
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {lockedTenant && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bedriftsnavn">Bedriftsnavn</Label>
                <Input
                  id="bedriftsnavn"
                  value={identityFor(lockedTenant).bedriftsnavn}
                  onChange={(event) =>
                    setOverrides((current) => ({
                      ...current,
                      [lockedTenant.id]: {
                        ...identityFor(lockedTenant),
                        bedriftsnavn: event.target.value,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orgNummer">Org.nummer</Label>
                <Input
                  id="orgNummer"
                  value={identityFor(lockedTenant).orgNummer}
                  onChange={(event) =>
                    setOverrides((current) => ({
                      ...current,
                      [lockedTenant.id]: {
                        ...identityFor(lockedTenant),
                        orgNummer: event.target.value,
                      },
                    }))
                  }
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dagligLeder">Daglig leder</Label>
            <Input
              id="dagligLeder"
              value={shared.dagligLeder}
              onChange={(event) =>
                setShared((current) => ({ ...current, dagligLeder: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hmsAnsvarlig">HMS-ansvarlig</Label>
            <Input
              id="hmsAnsvarlig"
              value={shared.hmsAnsvarlig}
              onChange={(event) =>
                setShared((current) => ({ ...current, hmsAnsvarlig: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="verneombud">Verneombud</Label>
            <Input
              id="verneombud"
              value={shared.verneombud}
              onChange={(event) =>
                setShared((current) => ({ ...current, verneombud: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brannvernleder">Brannvernleder</Label>
            <Input
              id="brannvernleder"
              value={shared.brannvernleder}
              onChange={(event) =>
                setShared((current) => ({ ...current, brannvernleder: event.target.value }))
              }
            />
          </div>
          {lockedTenant && (
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={identityFor(lockedTenant).adresse}
                onChange={(event) =>
                  setOverrides((current) => ({
                    ...current,
                    [lockedTenant.id]: {
                      ...identityFor(lockedTenant),
                      adresse: event.target.value,
                    },
                  }))
                }
              />
            </div>
          )}
        </div>

        {!lockedTenantId && selectedTenants.length > 1 && (
          <div className="space-y-2">
            <Label>Identitet per bedrift</Label>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
              {selectedTenants.map((tenant) => {
                const identity = identityFor(tenant);
                return (
                  <div key={tenant.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-3">
                    <Input
                      value={identity.bedriftsnavn}
                      onChange={(event) =>
                        setOverrides((current) => ({
                          ...current,
                          [tenant.id]: { ...identity, bedriftsnavn: event.target.value },
                        }))
                      }
                    />
                    <Input
                      value={identity.orgNummer}
                      onChange={(event) =>
                        setOverrides((current) => ({
                          ...current,
                          [tenant.id]: { ...identity, orgNummer: event.target.value },
                        }))
                      }
                      placeholder="Org.nr"
                    />
                    <Input
                      value={identity.adresse}
                      onChange={(event) =>
                        setOverrides((current) => ({
                          ...current,
                          [tenant.id]: { ...identity, adresse: event.target.value },
                        }))
                      }
                      placeholder="Adresse"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              result.success
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {result.success && <CheckCircle2 className="h-4 w-4" />}
            {result.message}
          </div>
        )}

        <Button
          onClick={handleApply}
          disabled={!selectedTemplate || selectedTenantIds.length === 0 || isPending}
          className="w-full"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Opprett utkast i {selectedTenantIds.length || 0} bedrift
          {selectedTenantIds.length === 1 ? "" : "er"}
        </Button>
      </CardContent>
    </Card>
  );
}
