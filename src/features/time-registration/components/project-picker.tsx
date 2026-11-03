"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  projectDisplayLabel,
  searchPickableProjects,
  type PickableProject,
} from "@/lib/time/project-search";

type Project = PickableProject & { externalProjectId?: string | null };

/** Søkbar prosjektvelger for timeregistrering (mobilvennlig, store treffflater). */
export function ProjectPicker({
  projects,
  value,
  onChange,
  assignedIds,
  showSyncBadge = false,
  accountingConnected = false,
}: {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  assignedIds: Set<string>;
  showSyncBadge?: boolean;
  accountingConnected?: boolean;
}) {
  const t = useTranslations("timesheet");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(!value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) setOpen(false);
  }, [value]);

  const selected = projects.find((p) => p.id === value) ?? null;
  const results = useMemo(() => searchPickableProjects(projects, query), [projects, query]);
  const assigned = results.filter((p) => assignedIds.has(p.id));
  const others = results.filter((p) => !assignedIds.has(p.id));

  function pick(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  if (selected && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-primary bg-primary/5 px-3 py-2">
        <span className="min-w-0 truncate text-sm font-medium">{projectDisplayLabel(selected)}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 bg-transparent"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        >
          {t("changeProject")}
        </Button>
      </div>
    );
  }

  function renderRow(p: Project) {
    const isSelected = p.id === value;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => pick(p.id)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-3 text-left text-sm hover:bg-muted ${
          isSelected ? "border-primary" : ""
        }`}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {[p.code, p.name].filter(Boolean).join(" ")}
          </span>
          {(p.clientName || p.parentName) && (
            <span className="block truncate text-xs text-muted-foreground">
              {[p.parentName ? `${t("mainProjectLabel")}: ${p.parentName}` : null, p.clientName]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {showSyncBadge && (p.externalProjectId ? t("inTripletex") : accountingConnected ? t("notInTripletex") : null)}
          {isSelected && <Check className="h-4 w-4 text-primary" />}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("projectSearch")}
          className="h-11 pl-9 pr-9"
          autoComplete="off"
          enterKeyHint="search"
        />
        {(query || selected) && (
          <button
            type="button"
            aria-label={t("cancel")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={() => {
              setQuery("");
              if (selected) setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {results.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">{t("projectSearchEmpty")}</p>
        ) : (
          <>
            {assigned.length > 0 && (
              <>
                <p className="px-1 pt-1 text-xs font-medium text-muted-foreground">{t("assignedToday")}</p>
                {assigned.map(renderRow)}
              </>
            )}
            {others.length > 0 && assigned.length > 0 && (
              <p className="px-1 pt-2 text-xs font-medium text-muted-foreground">{t("otherProjects")}</p>
            )}
            {others.map(renderRow)}
          </>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {t("projectCount", { count: results.length, total: projects.length })}
      </p>
    </div>
  );
}
