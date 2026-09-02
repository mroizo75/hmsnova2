"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  name: string;
  role: string;
  status: string;
}

export function TenantSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTenants();
    }
  }, [session?.user?.id]);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/user/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === session?.user?.tenantId) return;

    setLoading(true);
    setSwitchingTo(tenantId);

    try {
      const response = await fetch("/api/user/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke bytte bedrift");
      }

      await update({ tenantId });

      toast({
        title: "Bedrift byttet",
        description: `Du er nå koblet til ${tenants.find(t => t.id === tenantId)?.name}`,
      });

      window.location.href = "/dashboard";
    } catch (error) {
      toast({
        title: "Feil",
        description: error instanceof Error ? error.message : "Kunne ikke bytte bedrift",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSwitchingTo(null);
    }
  };

  // Ikke vis hvis brukeren bare har én tenant
  if (!session?.user?.hasMultipleTenants || tenants.length <= 1) {
    return null;
  }

  const currentTenant = tenants.find(t => t.id === session?.user?.tenantId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between" disabled={loading}>
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{currentTenant?.name || "Velg bedrift"}</span>
          </div>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel>Dine bedrifter</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleSwitchTenant(tenant.id)}
            disabled={loading || tenant.status === "CANCELLED" || tenant.status === "SUSPENDED"}
            className={tenant.id === session?.user?.tenantId ? "bg-accent" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {tenant.id === session?.user?.tenantId && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {switchingTo === tenant.id && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {tenant.id !== session?.user?.tenantId && switchingTo !== tenant.id && (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{getRoleLabel(tenant.role)}</p>
                </div>
              </div>
              {(tenant.status === "CANCELLED" || tenant.status === "SUSPENDED") && (
                <Badge variant="destructive" className="text-xs">
                  {tenant.status === "CANCELLED" ? "Kansellert" : "Suspendert"}
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Administrator",
    HMS: "HMS-ansvarlig",
    LEDER: "Leder",
    VERNEOMBUD: "Verneombud",
    ANSATT: "Ansatt",
    BHT: "Bedriftshelsetjeneste",
    REVISOR: "Revisor",
  };
  return labels[role] || role;
}
