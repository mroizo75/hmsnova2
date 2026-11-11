"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteOrphanKonsernTenants } from "@/server/actions/admin-corporate-group.actions";

interface OrphanTenant {
  id: string;
  name: string;
  orgNumber: string | null;
  status: string;
}

export function OrphanTenantsCleanup({ tenants }: { tenants: OrphanTenant[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (tenants.length === 0) return null;

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await deleteOrphanKonsernTenants(confirmText);
      toast({
        title: "Bedrifter slettet",
        description: `${result.deleted} bedrifter er slettet.`,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Kunne ikke slette",
        description: error instanceof Error ? error.message : "En feil oppstod",
        variant: "destructive",
      });
      setDeleting(false);
    }
  }

  return (
    <Card className="border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {tenants.length} bedrifter står igjen etter slettet konsern
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Disse ble opprettet som del av et konsern, og ble stående da konsernet ble slettet.
          De kan slettes samlet her.
        </p>
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border bg-gray-50 p-3 text-sm">
          {tenants.map((tenant) => (
            <li key={tenant.id} className="flex items-center justify-between gap-3">
              <span>{tenant.name}</span>
              <span className="shrink-0 text-xs text-gray-500">
                {tenant.orgNumber ?? tenant.status}
              </span>
            </li>
          ))}
        </ul>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Slett alle {tenants.length} bedrifter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Slett bedriftene som står igjen</DialogTitle>
              <DialogDescription>
                Dette sletter {tenants.length} bedrifter permanent, inkludert HMS-data, filer og
                brukere som bare hører til disse bedriftene.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Skriv <strong>SLETT</strong> for å bekrefte:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="SLETT"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
                Avbryt
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== "SLETT" || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sletter...
                  </>
                ) : (
                  "Slett permanent"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
