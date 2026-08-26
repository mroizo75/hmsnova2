"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  CheckCircle,
  Archive,
  Trash2,
  Loader2,
  Undo2,
  Building2,
} from "lucide-react";
import {
  publishGroupContent,
  archiveGroupContent,
  deleteGroupContent,
  distributeContent,
  withdrawDistribution,
} from "@/server/actions/corporate-group-content.actions";

interface Tenant {
  id: string;
  name: string;
  city: string | null;
}

interface Distribution {
  id: string;
  tenantId: string;
  status: string;
  locallyModified: boolean;
  tenant: Tenant;
}

interface ContentActionsProps {
  contentId: string;
  status: string;
  distributions: Distribution[];
  availableTenants: Tenant[];
}

export function ContentActions({
  contentId,
  status,
  distributions,
  availableTenants,
}: ContentActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [showDistribute, setShowDistribute] = useState(false);

  const distributedTenantIds = distributions
    .filter((d) => d.status === "DISTRIBUTED")
    .map((d) => d.tenantId);

  const undistributedTenants = availableTenants.filter(
    (t) => !distributedTenantIds.includes(t.id)
  );

  function handlePublish() {
    startTransition(async () => {
      try {
        await publishGroupContent(contentId);
        toast({ title: "Publisert", description: "Innholdet er nå klart for distribusjon" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleArchive() {
    if (!confirm("Arkivere dette innholdet?")) return;
    startTransition(async () => {
      try {
        await archiveGroupContent(contentId);
        toast({ title: "Arkivert" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleDelete() {
    if (!confirm("Slette dette innholdet permanent? Dette kan ikke angres.")) return;
    startTransition(async () => {
      try {
        await deleteGroupContent(contentId);
        toast({ title: "Slettet" });
        router.push("/konsern/innhold");
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleDistribute() {
    if (selectedTenants.length === 0) return;
    startTransition(async () => {
      try {
        await distributeContent(contentId, selectedTenants);
        toast({
          title: "Distribuert",
          description: `Sendt til ${selectedTenants.length} bedrift${selectedTenants.length > 1 ? "er" : ""}`,
        });
        setSelectedTenants([]);
        setShowDistribute(false);
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function handleWithdraw(tenantId: string, tenantName: string) {
    if (!confirm(`Trekke tilbake distribusjon til ${tenantName}?`)) return;
    startTransition(async () => {
      try {
        await withdrawDistribution(contentId, tenantId);
        toast({ title: "Trukket tilbake" });
        router.refresh();
      } catch (err) {
        toast({ title: "Feil", description: String(err), variant: "destructive" });
      }
    });
  }

  function toggleTenant(tenantId: string) {
    setSelectedTenants((prev) =>
      prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId]
    );
  }

  function selectAll() {
    setSelectedTenants(undistributedTenants.map((t) => t.id));
  }

  return (
    <div className="space-y-4">
      {/* Handlingsknapper */}
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <Button onClick={handlePublish} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Publiser
          </Button>
        )}

        {status === "PUBLISHED" && undistributedTenants.length > 0 && (
          <Button onClick={() => setShowDistribute(!showDistribute)} disabled={pending}>
            <Send className="mr-2 h-4 w-4" />
            Distribuer til bedrifter
          </Button>
        )}

        {status !== "ARCHIVED" && (
          <Button variant="outline" onClick={handleArchive} disabled={pending}>
            <Archive className="mr-2 h-4 w-4" />
            Arkiver
          </Button>
        )}

        {distributions.length === 0 && (
          <Button variant="outline" onClick={handleDelete} disabled={pending} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />
            Slett
          </Button>
        )}
      </div>

      {/* Distribuer-panel */}
      {showDistribute && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Velg bedrifter å distribuere til</CardTitle>
              {undistributedTenants.length > 1 && (
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Velg alle
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {undistributedTenants.length === 0 ? (
              <p className="text-sm text-gray-500">Alle bedrifter har allerede mottatt dette innholdet.</p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {undistributedTenants.map((tenant) => (
                    <label
                      key={tenant.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-blue-300"
                    >
                      <Checkbox
                        checked={selectedTenants.includes(tenant.id)}
                        onCheckedChange={() => toggleTenant(tenant.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{tenant.name}</p>
                        {tenant.city && <p className="text-xs text-gray-500">{tenant.city}</p>}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowDistribute(false)}>
                    Avbryt
                  </Button>
                  <Button size="sm" onClick={handleDistribute} disabled={pending || selectedTenants.length === 0}>
                    {pending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Distribuer til {selectedTenants.length} bedrift{selectedTenants.length !== 1 ? "er" : ""}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Distribusjoner med trekk-tilbake */}
      {distributions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Distribusjoner</CardTitle>
              <span className="text-sm text-gray-500">
                {distributedTenantIds.length} av {availableTenants.length} bedrifter
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {distributions.map((dist) => {
                const isActive = dist.status === "DISTRIBUTED";
                return (
                  <div key={dist.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dist.tenant.name}</p>
                        <p className="text-xs text-gray-500">
                          {dist.tenant.city}
                          {dist.locallyModified && (
                            <span className="ml-2 text-amber-600">· Lokalt endret</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        isActive ? "text-green-600" : dist.status === "WITHDRAWN" ? "text-gray-500" : "text-amber-600"
                      }`}>
                        {isActive ? "Aktiv" : dist.status === "WITHDRAWN" ? "Trukket tilbake" : dist.status}
                      </span>
                      {isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-gray-500 hover:text-red-600"
                          onClick={() => handleWithdraw(dist.tenantId, dist.tenant.name)}
                          disabled={pending}
                        >
                          <Undo2 className="mr-1 h-3 w-3" />
                          Trekk tilbake
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
