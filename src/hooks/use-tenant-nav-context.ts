"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { ModuleVisibilityConfig } from "@/lib/module-visibility";

interface TenantApiResponseItem {
  id: string;
  industry?: string | null;
  features?: string[];
  moduleVisibilityConfig?: ModuleVisibilityConfig | null;
  aiEnabled?: boolean;
}

type TenantNavSnapshot = {
  tenantFeatures: string[];
  moduleVisibility: ModuleVisibilityConfig | null;
  tenantIndustry: string | null;
  aiEnabled: boolean;
};

const emptySnapshot: TenantNavSnapshot = {
  tenantFeatures: [],
  moduleVisibility: null,
  tenantIndustry: null,
  aiEnabled: false,
};

const snapshotCache = new Map<string, { data: TenantNavSnapshot; expiresAt: number }>();
const inflight = new Map<string, Promise<TenantNavSnapshot>>();
const SNAPSHOT_TTL_MS = 30_000;

function toSnapshot(tenant: TenantApiResponseItem | undefined): TenantNavSnapshot {
  return {
    tenantFeatures: tenant?.features ?? [],
    moduleVisibility: tenant?.moduleVisibilityConfig ?? null,
    tenantIndustry: tenant?.industry ?? null,
    aiEnabled: Boolean(tenant?.aiEnabled),
  };
}

async function loadTenantSnapshot(tenantId: string): Promise<TenantNavSnapshot> {
  const cached = snapshotCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pending = inflight.get(tenantId);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch("/api/user/tenants");
    if (!response.ok) return emptySnapshot;
    const data: { tenants?: TenantApiResponseItem[] } = await response.json();
    const currentTenant = (data.tenants ?? []).find((tenant) => tenant.id === tenantId);
    const snapshot = toSnapshot(currentTenant);
    snapshotCache.set(tenantId, { data: snapshot, expiresAt: Date.now() + SNAPSHOT_TTL_MS });
    return snapshot;
  })().finally(() => {
    inflight.delete(tenantId);
  });

  inflight.set(tenantId, request);
  return request;
}

export function invalidateTenantNavCache(): void {
  snapshotCache.clear();
  inflight.clear();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("hms-tenant-nav-invalidate"));
  }
}

export function useTenantNavContext() {
  const { data: session } = useSession();
  const [tenantFeatures, setTenantFeatures] = useState<string[] | null>(null);
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibilityConfig | null>(null);
  const [tenantIndustry, setTenantIndustry] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const onInvalidate = () => setReloadToken((value) => value + 1);
    window.addEventListener("hms-tenant-nav-invalidate", onInvalidate);
    return () => window.removeEventListener("hms-tenant-nav-invalidate", onInvalidate);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const tenantId = session?.user?.tenantId;

    const apply = (snapshot: TenantNavSnapshot) => {
      if (!isMounted) return;
      setTenantFeatures(snapshot.tenantFeatures);
      setModuleVisibility(snapshot.moduleVisibility);
      setTenantIndustry(snapshot.tenantIndustry);
      setAiEnabled(snapshot.aiEnabled);
    };

    if (!tenantId) {
      apply(emptySnapshot);
      return () => {
        isMounted = false;
      };
    }

    void loadTenantSnapshot(tenantId)
      .then(apply)
      .catch(() => apply(emptySnapshot));

    return () => {
      isMounted = false;
    };
  }, [session?.user?.tenantId, reloadToken]);

  return { tenantFeatures, moduleVisibility, tenantIndustry, aiEnabled };
}
