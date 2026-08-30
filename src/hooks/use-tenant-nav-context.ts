"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { ModuleVisibilityConfig } from "@/lib/module-visibility";

interface TenantApiResponseItem {
  id: string;
  industry?: string | null;
  features?: string[];
  moduleVisibilityConfig?: ModuleVisibilityConfig | null;
}

export function useTenantNavContext() {
  const { data: session } = useSession();
  const [tenantFeatures, setTenantFeatures] = useState<string[] | null>(null);
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibilityConfig | null>(null);
  const [tenantIndustry, setTenantIndustry] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTenant = async () => {
      if (!session?.user?.tenantId) {
        if (isMounted) {
          setTenantFeatures([]);
          setModuleVisibility(null);
          setTenantIndustry(null);
        }
        return;
      }

      try {
        const response = await fetch("/api/user/tenants");
        if (!response.ok) {
          if (isMounted) {
            setTenantFeatures([]);
            setModuleVisibility(null);
            setTenantIndustry(null);
          }
          return;
        }

        const data: { tenants?: TenantApiResponseItem[] } = await response.json();
        const currentTenant = (data.tenants ?? []).find(
          (tenant) => tenant.id === session.user.tenantId,
        );
        if (isMounted) {
          setTenantFeatures(currentTenant?.features ?? []);
          setModuleVisibility(currentTenant?.moduleVisibilityConfig ?? null);
          setTenantIndustry(currentTenant?.industry ?? null);
        }
      } catch {
        if (isMounted) {
          setTenantFeatures([]);
          setModuleVisibility(null);
          setTenantIndustry(null);
        }
      }
    };

    fetchTenant();
    return () => {
      isMounted = false;
    };
  }, [session?.user?.tenantId]);

  return { tenantFeatures, moduleVisibility, tenantIndustry };
}
