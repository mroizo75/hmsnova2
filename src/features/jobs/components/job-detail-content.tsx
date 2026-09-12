"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  addUsageLine,
  completeFieldJob,
  promoteJobToHms,
} from "@/server/actions/accounting.actions";

type Product = {
  externalId: string;
  name: string;
  unit: string | null;
  priceExclVat: number | null;
};

type JobDetail = {
  project: {
    id: string;
    name: string;
    clientName: string | null;
    location: string | null;
    jobKind: string;
    status: string;
    billingStatus: string;
    timeEntries: Array<{ id: string; hours: number; timeType: string; comment: string | null }>;
    usageLines: Array<{ id: string; productName: string; quantity: number; kind: string }>;
  };
  tenant: {
    tripletexProductKmId: string | null;
    tripletexProductMachineHoursId: string | null;
  } | null;
  products: Product[];
};

export function JobDetailContent({ initialData }: { initialData: JobDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const { project, tenant, products } = initialData;
  const [qty, setQty] = useState("1");
  const [productId, setProductId] = useState(products[0]?.externalId ?? "");
  const [km, setKm] = useState("");
  const [machineHours, setMachineHours] = useState("");
  const [loading, setLoading] = useState(false);
  const active = project.status === "ACTIVE";

  async function run(fn: () => Promise<{ success: boolean; error?: string }>, ok: string) {
    setLoading(true);
    const res = await fn();
    setLoading(false);
    if (!res.success) {
      toast({ title: "Feil", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: ok });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge variant="outline" className="bg-transparent">
            {project.jobKind === "HMS" ? "HMS-prosjekt" : "Småjobb"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {project.clientName}
          {project.location ? ` · ${project.location}` : ""}
        </p>
      </div>

      {active && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">Timer</p>
            <Button className="w-full" asChild>
              <Link href={`/ansatt/timeregistrering?projectId=${project.id}`}>
                Registrer dag (fra–til)
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {active && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">Km-tillegg</p>
            <Input type="number" min="1" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Antall km" />
            <Button
              variant="outline"
              className="w-full bg-transparent"
              disabled={loading || !km}
              onClick={() =>
                run(
                  () =>
                    addUsageLine({
                      projectId: project.id,
                      kind: "KM",
                      productExternalId: tenant?.tripletexProductKmId ?? productId,
                      quantity: Number(km),
                    }),
                  "Km lagt til"
                )
              }
            >
              Legg til km
            </Button>
          </CardContent>
        </Card>
      )}

      {active && tenant?.tripletexProductMachineHoursId && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">Maskintimer</p>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              value={machineHours}
              onChange={(e) => setMachineHours(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full bg-transparent"
              disabled={loading || !machineHours}
              onClick={() =>
                run(
                  () =>
                    addUsageLine({
                      projectId: project.id,
                      kind: "MACHINE",
                      productExternalId: tenant.tripletexProductMachineHoursId as string,
                      quantity: Number(machineHours),
                    }),
                  "Maskintimer lagt til"
                )
              }
            >
              Legg til maskintimer
            </Button>
          </CardContent>
        </Card>
      )}

      {active && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">Vare</p>
            <select
              className="h-10 w-full rounded-md border bg-transparent px-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.externalId} value={p.externalId}>
                  {p.name}
                </option>
              ))}
            </select>
            <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            <Button
              variant="outline"
              className="w-full bg-transparent"
              disabled={loading || !productId}
              onClick={() =>
                run(
                  () =>
                    addUsageLine({
                      projectId: project.id,
                      kind: "PRODUCT",
                      productExternalId: productId,
                      quantity: Number(qty),
                    }),
                  "Vare lagt til"
                )
              }
            >
              Legg til vare
            </Button>
          </CardContent>
        </Card>
      )}

      {project.jobKind === "SERVICE" && (
        <Button
          variant="outline"
          className="w-full bg-transparent"
          disabled={loading}
          onClick={() => run(() => promoteJobToHms(project.id), "Løftet til HMS-prosjekt")}
        >
          Gjør om til HMS-prosjekt
        </Button>
      )}

      {project.jobKind === "HMS" && (
        <p className="text-sm text-muted-foreground">
          HMS-prosjekt: avvik og SJA meldes i egne menyer, med prosjekt på saken. SHA og vernerunde styres av HMS-ansvarlig.
        </p>
      )}

      {active && (
        <Button
          className="h-12 w-full"
          disabled={loading}
          onClick={() => run(() => completeFieldJob(project.id), "Jobben er ferdig")}
        >
          Jobben er ferdig
        </Button>
      )}

      {!active && (
        <p className="text-center text-sm text-muted-foreground">
          Jobben er ferdig og ligger klar til faktura hos leder.
        </p>
      )}

      <Card>
        <CardContent className="space-y-1 py-4 text-sm">
          {project.timeEntries.map((e) => (
            <div key={e.id} className="flex justify-between">
              <span>{e.timeType}</span>
              <span>{e.hours} t</span>
            </div>
          ))}
          {project.usageLines.map((l) => (
            <div key={l.id} className="flex justify-between">
              <span>{l.productName}</span>
              <span>{l.quantity}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
