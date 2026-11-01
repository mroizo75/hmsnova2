"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { ChecklistOverviewItem, ChecklistRecentRun } from "@/server/queries/checklist.queries";

type Filter = "ACTIVE" | "DRAFT" | "ARCHIVED" | "ALL";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "ACTIVE", label: "Aktive" },
  { id: "DRAFT", label: "Kladder" },
  { id: "ARCHIVED", label: "Arkiv" },
  { id: "ALL", label: "Alle" },
];

function formatWhen(value: string) {
  return new Date(value).toLocaleString("nb-NO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChecklistOverview({
  items,
  recentRuns,
  canManage,
  basePath,
}: {
  items: ChecklistOverviewItem[];
  recentRuns: ChecklistRecentRun[];
  canManage: boolean;
  basePath: "/dashboard/sjekklister" | "/ansatt/sjekklister";
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const visibleFilters = canManage ? FILTERS : FILTERS.filter((item) => item.id === "ACTIVE");

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return items.filter((item) => {
      if (canManage && filter !== "ALL" && item.status !== filter) return false;
      if (!text) return true;
      return `${item.title} ${item.description ?? ""} ${item.usageNote ?? ""}`.toLowerCase().includes(text);
    });
  }, [canManage, filter, items, query]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Søk i sjekklister"
          className="sm:max-w-sm"
        />
        {visibleFilters.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {visibleFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`min-h-11 rounded-full border px-3 text-sm ${
                  filter === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">
            {items.length === 0 ? "Ingen sjekklister ennå" : "Ingen treff"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {canManage
              ? "Lag en sjekkliste for oppstart, kontroll eller noe bedriften gjør jevnlig. Velg hvem som fyller ut, og hvem som får resultatet."
              : "Når bedriften publiserer en sjekkliste du har tilgang til, vises den her."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-2xl border bg-card p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <StatusChip status={item.status} />
                  </div>
                  {item.usageNote && <p className="mt-1 text-sm text-muted-foreground">{item.usageNote}</p>}
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.itemCount} punkter · {item.accessLabel}
                    {item.lastSubmittedAt ? ` · sist ${formatWhen(item.lastSubmittedAt)}` : ""}
                  </p>
                  {item.deviationsLast30Days > 0 && (
                    <p className="mt-2 text-sm font-medium text-amber-800">
                      {item.deviationsLast30Days} avvik siste 30 dager
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.canFill && item.status !== "DRAFT" && (
                    <Link
                      href={basePath === "/dashboard/sjekklister" ? `${basePath}/${item.id}/fyll` : `${basePath}/${item.id}`}
                      className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    >
                      Fyll ut
                    </Link>
                  )}
                  {basePath === "/dashboard/sjekklister" && (
                    <Link
                      href={`${basePath}/${item.id}`}
                      className="inline-flex min-h-11 items-center rounded-md border border-border bg-transparent px-4 text-sm font-medium"
                    >
                      Åpne
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Siste innsendinger</h2>
        {recentRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen innsendinger ennå.</p>
        ) : (
          <div className="divide-y rounded-2xl border bg-card">
            {recentRuns.map((run) => (
              <Link
                key={run.id}
                href={
                  basePath === "/dashboard/sjekklister"
                    ? `${basePath}/${run.checklistId}/innsendinger/${run.id}`
                    : `${basePath}/${run.checklistId}/resultat/${run.id}`
                }
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {run.checklistTitle}
                    <span className="ml-2 font-normal text-muted-foreground">{run.reference}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {run.submittedByName}
                    {run.projectName ? ` · ${run.projectName}` : ""}
                    {run.location ? ` · ${run.location}` : ""} · {formatWhen(run.submittedAt)}
                  </p>
                </div>
                <p className={`text-sm font-medium ${run.deviationCount > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                  {run.deviationCount > 0 ? `${run.deviationCount} avvik` : "Ingen avvik"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusChip({ status }: { status: ChecklistOverviewItem["status"] }) {
  const label = status === "ACTIVE" ? "Aktiv" : status === "DRAFT" ? "Kladd" : "Arkivert";
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{label}</span>;
}
