import { tokenizeProductQuery } from "./product-search";

export type PickableProject = {
  id: string;
  name: string;
  code?: string | null;
  clientName?: string | null;
  parentId: string | null;
  parentName?: string | null;
  status?: string;
};

/** Tekst som vises i prosjektvelgeren, f.eks. "26045 Montering · Kunde AS". */
export function projectDisplayLabel(p: PickableProject): string {
  const base = [p.code, p.name].filter(Boolean).join(" ");
  const withParent = p.parentName ? `${p.parentName} › ${base}` : base;
  return p.clientName ? `${withParent} · ${p.clientName}` : withParent;
}

/** AND-søk: alle ord må finnes i nummer, navn, kunde eller hovedprosjekt. */
export function projectMatchesQuery(p: PickableProject, query: string): boolean {
  const words = tokenizeProductQuery(query);
  if (words.length === 0) return true;
  const hay = [p.code ?? "", p.name, p.clientName ?? "", p.parentName ?? ""].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}

/**
 * Prosjekter som skal kunne velges direkte i hovedlisten:
 * hovedprosjekter, pluss underprosjekter der hovedprosjektet ikke er valgbart
 * (f.eks. avsluttet i Tripletex) — ellers blir de usynlige.
 */
export function topLevelPickableProjects<T extends PickableProject>(projects: T[]): T[] {
  const ids = new Set(projects.map((p) => p.id));
  return projects.filter((p) => !p.parentId || !ids.has(p.parentId));
}

export function childProjectsOf<T extends PickableProject>(projects: T[], parentId: string): T[] {
  return projects.filter((p) => p.parentId === parentId);
}

/** Hovedprosjekt-ID for et valgt prosjekt (seg selv hvis det er toppnivå i listen). */
export function pickerRootId<T extends PickableProject>(projects: T[], projectId: string): string {
  const selected = projects.find((p) => p.id === projectId);
  if (!selected?.parentId) return projectId;
  const parentVisible = projects.some((p) => p.id === selected.parentId);
  return parentVisible ? selected.parentId : projectId;
}

/**
 * Søk i prosjektvelgeren. Treff på et underprosjekt viser hovedprosjektet,
 * så den ansatte kan velge riktig underprosjekt etterpå.
 */
export function searchPickableProjects<T extends PickableProject>(projects: T[], query: string): T[] {
  const top = topLevelPickableProjects(projects);
  if (tokenizeProductQuery(query).length === 0) return top;
  const hitRoots = new Set<string>();
  for (const p of projects) {
    if (projectMatchesQuery(p, query)) hitRoots.add(pickerRootId(projects, p.id));
  }
  return top.filter((p) => hitRoots.has(p.id));
}
