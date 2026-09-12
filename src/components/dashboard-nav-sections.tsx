"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_ICONS } from "@/lib/dashboard-nav-icons";
import { isDashboardNavHrefActive } from "@/lib/dashboard-nav-filter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  isNavHubOpen,
  NAV_HUB_OPEN_STORAGE_KEY,
  parseNavHubOpenState,
  type DashboardNavHubGroup,
} from "@/lib/dashboard-nav-hub-groups";
import type { CoreHub, DashboardNavItemConfig } from "@/lib/dashboard-nav-config";

function NavItemLink({
  item,
  pathname,
  onNavigate,
  allHrefs,
}: {
  item: DashboardNavItemConfig;
  pathname: string;
  onNavigate?: () => void;
  allHrefs: string[];
}) {
  const t = useTranslations();
  const Icon = DASHBOARD_NAV_ICONS[item.href] ?? FileText;
  const isActive = isDashboardNavHrefActive(pathname, item.href, allHrefs);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] leading-tight transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{t(item.label)}</span>
    </Link>
  );
}

export function DashboardNavWorkGroups({
  groups,
  pathname,
  onNavigate,
}: {
  groups: DashboardNavHubGroup[];
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations();
  const allHrefs = useMemo(
    () => groups.flatMap((group) => group.items.map((item) => item.href)),
    [groups],
  );
  const [openHubs, setOpenHubs] = useState<Partial<Record<CoreHub, boolean>>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOpenHubs(parseNavHubOpenState(window.localStorage.getItem(NAV_HUB_OPEN_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(NAV_HUB_OPEN_STORAGE_KEY, JSON.stringify(openHubs));
  }, [hydrated, openHubs]);

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
      {groups.map((group) => {
        const open = isNavHubOpen(group.hub, openHubs);
        const isActiveGroup = group.items.some((item) =>
          isDashboardNavHrefActive(pathname, item.href, allHrefs),
        );
        return (
          <Collapsible
            key={group.hub}
            open={open}
            onOpenChange={(next) =>
              setOpenHubs((current) => ({ ...current, [group.hub]: next }))
            }
          >
            <CollapsibleTrigger
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent hover:text-foreground",
                isActiveGroup && "text-foreground",
              )}
            >
              <span>{t(group.labelKey)}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pb-1 pl-0.5">
              {group.items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  allHrefs={allHrefs}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );
}

export function DashboardNavFooterLinks({
  groups,
  pathname,
  onNavigate,
}: {
  groups: DashboardNavHubGroup[];
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const items = groups.flatMap((group) => group.items);
  if (items.length === 0) return null;
  const allHrefs = items.map((item) => item.href);

  return (
    <div className="space-y-0.5 border-t px-2 py-2">
      {items.map((item) => (
        <NavItemLink
          key={item.href}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
          allHrefs={allHrefs}
        />
      ))}
    </div>
  );
}
