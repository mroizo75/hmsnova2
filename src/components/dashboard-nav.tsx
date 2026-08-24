"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  AlertCircle,
  GraduationCap,
  ClipboardCheck,
  ListTodo,
  Target,
  Settings,
  LogOut,
  Beaker,
  ShieldCheck,
  FileBarChart,
  Calendar,
  Shield,
  Leaf,
  Layers,
  HeartPulse,
  LifeBuoy,
  MessageSquare,
  ThumbsUp,
  Sparkles,
  Zap,
  ListChecks,
  Clock,
  Scale,
  HardHat,
  FlaskConical,
  BarChart3,
  FolderOpen,
  Plug,
  FileCheck2,
  Building2,
  Flame,
  Monitor,
  Headphones,
  BookOpen,
  Users,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { getRoleDisplayName } from "@/lib/permissions";
import Image from "next/image";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useSimpleMode } from "@/hooks/use-simple-mode";
import { useSimpleMenuConfig } from "@/hooks/use-simple-menu-config";
import { TenantSwitcher } from "@/components/auth/tenant-switcher";
import type { TenantFeature } from "@/lib/tenant-features";
import {
  isNavItemAllowedByModuleVisibility,
  type ModuleVisibilityConfig,
} from "@/lib/module-visibility";
import { Role } from "@prisma/client";

interface TenantApiResponseItem {
  id: string;
  features?: string[];
  moduleVisibilityConfig?: ModuleVisibilityConfig | null;
}

const navItems: Array<{
  href: string;
  label: string;
  icon: any;
  permission: string;
  simple: boolean;
  feature?: TenantFeature;
}> = [
  // === GRUNNLEGGENDE HMS (vises alltid) ===
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard, permission: "dashboard" as const, simple: true },
  { href: "/dashboard/hms-handbok", label: "nav.hmsHandbok", icon: BookOpen, permission: "hmsHandbok" as const, simple: true },
  { href: "/dashboard/documents", label: "nav.documents", icon: FileText, permission: "documents" as const, simple: true },
  { href: "/dashboard/rutiner", label: "nav.routines", icon: ListChecks, permission: "routines" as const, simple: true },
  { href: "/dashboard/samsvarserklaringer", label: "nav.electro", icon: FileCheck2, permission: "documents" as const, simple: true },
  { href: "/dashboard/juridisk-register", label: "nav.legalRegister", icon: Scale, permission: "legalRegister" as const, simple: true },
  { href: "/dashboard/incidents", label: "nav.incidents", icon: AlertCircle, permission: "incidents" as const, simple: true },
  { href: "/dashboard/projects", label: "nav.projects", icon: FolderOpen, permission: "incidents" as const, simple: true },
  { href: "/dashboard/construction-compliance", label: "nav.constructionCompliance", icon: HardHat, permission: "constructionCompliance" as const, simple: true },
  { href: "/dashboard/hms-tavle", label: "nav.hmsTavle", icon: Monitor, permission: "hmsTavle" as const, simple: true },
  { href: "/dashboard/incidents/statistics", label: "nav.hseStatistics", icon: BarChart3, permission: "incidents" as const, simple: false, feature: "trir" },
  { href: "/dashboard/sja", label: "nav.sja", icon: HardHat, permission: "sja" as const, simple: true },
  { href: "/dashboard/inspections", label: "nav.inspections", icon: ShieldCheck, permission: "inspections" as const, simple: true },
  { href: "/dashboard/fire-drills", label: "nav.fireDrills", icon: Flame, permission: "inspections" as const, simple: true },
  { href: "/dashboard/training", label: "nav.training", icon: GraduationCap, permission: "training" as const, simple: true },
  { href: "/dashboard/actions", label: "nav.actions", icon: ListTodo, permission: "actions" as const, simple: true },
  { href: "/dashboard/chemicals", label: "nav.chemicals", icon: Beaker, permission: "chemicals" as const, simple: true },
  { href: "/dashboard/exposure-register", label: "nav.exposureRegister", icon: FlaskConical, permission: "exposureRegister" as const, simple: true },
  
  // === AVANSERT (kun i avansert modus) ===
  { href: "/dashboard/risks", label: "nav.risks", icon: AlertTriangle, permission: "risks" as const, simple: false },
  { href: "/dashboard/risk-register", label: "nav.riskRegister", icon: Layers, permission: "risks" as const, simple: false },
  { href: "/dashboard/wellbeing", label: "nav.wellbeing", icon: HeartPulse, permission: "inspections" as const, simple: true },
  { href: "/dashboard/complaints", label: "nav.complaints", icon: MessageSquare, permission: "incidents" as const, simple: false },
  { href: "/dashboard/feedback", label: "nav.feedback", icon: ThumbsUp, permission: "feedback" as const, simple: false },
  { href: "/dashboard/environment", label: "nav.environment", icon: Leaf, permission: "environment" as const, simple: false },
  { href: "/dashboard/bcm", label: "nav.bcm", icon: LifeBuoy, permission: "audits" as const, simple: false },
  { href: "/dashboard/audits", label: "nav.audits", icon: ClipboardCheck, permission: "audits" as const, simple: false },
  { href: "/dashboard/management-reviews", label: "nav.managementReviews", icon: FileBarChart, permission: "managementReviews" as const, simple: false },
  { href: "/dashboard/annual-hms-plan", label: "nav.annualHmsPlan", icon: ListChecks, permission: "annualHmsPlan" as const, simple: true },
  { href: "/dashboard/meetings", label: "nav.meetings", icon: Calendar, permission: "meetings" as const, simple: false },
  { href: "/dashboard/time-registration", label: "nav.timeRegistration", icon: Clock, permission: "timeRegistration" as const, simple: true },
  { href: "/dashboard/medarbeidersamtale", label: "nav.employeeReviews", icon: MessageSquare, permission: "employeeReviews" as const, simple: false },
  { href: "/dashboard/whistleblowing", label: "nav.whistleblowing", icon: Shield, permission: "whistleblowing" as const, simple: false },
  { href: "/dashboard/goals", label: "nav.goals", icon: Target, permission: "goals" as const, simple: false },
  
  // === ORGANISASJON & INNSTILLINGER (vises alltid) ===
  { href: "/dashboard/brukere", label: "nav.users", icon: Users, permission: "settings" as const, simple: true },
  { href: "/dashboard/organisasjonskart", label: "nav.orgChart", icon: Building2, permission: "settings" as const, simple: true },
  { href: "/dashboard/support", label: "nav.support", icon: Headphones, permission: "support" as const, simple: true },
  { href: "/dashboard/settings", label: "nav.settings", icon: Settings, permission: "settings" as const, simple: true },
];

export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const { data: session } = useSession();
  const { visibleNavItems, role, permissions } = usePermissions();
  const { isSimpleMode, toggleMode } = useSimpleMode();
  const { simpleMenuItems } = useSimpleMenuConfig();
  const [tenantFeatures, setTenantFeatures] = useState<string[] | null>(null);
  const [moduleVisibility, setModuleVisibility] = useState<ModuleVisibilityConfig | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTenantFeatures = async () => {
      if (!session?.user?.tenantId) {
        if (isMounted) {
          setTenantFeatures([]);
          setModuleVisibility(null);
        }
        return;
      }

      try {
        const response = await fetch("/api/user/tenants");
        if (!response.ok) {
          if (isMounted) {
            setTenantFeatures([]);
            setModuleVisibility(null);
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
        }
      } catch {
        if (isMounted) {
          setTenantFeatures([]);
          setModuleVisibility(null);
        }
      }
    };

    fetchTenantFeatures();
    return () => {
      isMounted = false;
    };
  }, [session?.user?.tenantId]);

  // Filtrer navigasjon basert på tilganger, modul-synlighet OG enkel/avansert modus.
  // null-config behandles som MODULE_DEFAULTS (aldri hopp over synlighetssjekk).
  const allowedNavItems = navItems.filter((item) => {
    if (!visibleNavItems[item.permission as keyof typeof visibleNavItems]) return false;
    if (item.feature && !tenantFeatures?.includes(item.feature)) return false;
    if (
      role &&
      !isNavItemAllowedByModuleVisibility(
        item.permission,
        role as Role,
        moduleVisibility,
        permissions
      )
    ) {
      return false;
    }
    if (!isSimpleMode) return true;
    // I enkel modus: bruk tenant-valg hvis satt, ellers standard (item.simple)
    if (simpleMenuItems !== null && Array.isArray(simpleMenuItems)) {
      return simpleMenuItems.includes(item.href);
    }
    return item.simple;
  });

  const tenantName = session?.user?.tenantName;

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:h-dvh lg:flex-col">
      <div className="flex h-full flex-col">
        <div className="border-b p-6">
          <div className="flex items-start justify-between mb-2">
            <Image src="/logo-nova.png" alt="HMS Nova" width={155} height={100} />
            <NotificationBell />
          </div>
          {tenantName && (
            <p className="text-sm font-semibold text-foreground mt-3 truncate">
              {tenantName}
            </p>
          )}
          {role && (
            <Badge variant="outline" className="mt-2 text-xs">
              {getRoleDisplayName(role)}
            </Badge>
          )}
          
          {/* Tenant Switcher (kun hvis brukeren har flere tenants) */}
          <div className="mt-3">
            <TenantSwitcher />
          </div>
        </div>

        {/* Enkel/Avansert toggle */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSimpleMode ? (
                <Zap className="h-4 w-4 text-blue-500" />
              ) : (
                <Sparkles className="h-4 w-4 text-purple-500" />
              )}
              <span className="text-xs font-medium">
                {isSimpleMode ? t("dashboardNav.simpleMode") : t("dashboardNav.advancedMode")}
              </span>
            </div>
            <Switch
              checked={!isSimpleMode}
              onCheckedChange={() => toggleMode()}
              className="scale-75"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {isSimpleMode 
              ? t("dashboardNav.simpleDescription")
              : t("dashboardNav.advancedDescription")}
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
            {session?.user?.name || session?.user?.email}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            {t("auth.logout")}
          </Button>
        </div>
      </div>
    </aside>
  );
}

