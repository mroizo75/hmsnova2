"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bell, PlusCircle, Pencil, Plus, Save, X, RotateCcw, TrendingUp, ArrowRight } from "lucide-react";
import {
  Star, Flag, ClipboardList, Shield, FileText, CheckCircle2,
  Flame, Droplets, Zap, HardHat, Stethoscope, Heart, Leaf,
  Wrench, Truck, Building2, UtensilsCrossed, GraduationCap, Plug,
  Thermometer, Eye, Lock, Package, Hammer, Warehouse,
} from "lucide-react";
import { DashboardTile } from "./dashboard-tile";
import { WidgetCatalog } from "./widget-catalog";
import { HmsTrendChart } from "./hms-trend-chart";
import { RecentIncidentsCard } from "./recent-incidents-card";
import {
  getWidgetById,
  DEFAULT_WIDGET_IDS,
  WIDGET_REGISTRY,
  type WidgetDefinition,
} from "../lib/widget-registry";
import {
  getDashboardConfig,
  saveDashboardConfig,
  resetDashboardToDefaults,
  type DashboardWidgetConfig,
} from "@/server/actions/dashboard-config.actions";
import Link from "next/link";
import { SetupGuide } from "@/features/onboarding/components/setup-guide";
import type { SetupGuideProgress } from "@/server/actions/onboarding.actions";
import { TavlePromoBanner } from "@/features/hms-tavle/components/tavle-promo-banner";

type WidgetConfig = DashboardWidgetConfig;

interface DashboardData {
  moduleCounts: Record<string, number>;
  formLinkOptions: Array<{ label: string; href: string }>;
  statusItems: Array<{
    id: string;
    title: string;
    count: number;
    href: string;
    level: "critical" | "warning" | "info";
  }>;
  weeklyTrendData?: Array<{ week: string; opened: number; closed: number }>;
  recentIncidents?: Array<{
    id: string;
    title: string;
    location: string;
    occurredAt: string;
    status: string;
  }>;
}

interface CustomizableDashboardProps {
  data: DashboardData;
  dashboardLocked?: boolean;
  setupGuideProgress?: SetupGuideProgress | null;
  tenantId?: string;
  showTavleBanner?: boolean;
}

export function CustomizableDashboard({ data, dashboardLocked = false, setupGuideProgress, tenantId, showTavleBanner }: CustomizableDashboardProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preEditState, setPreEditState] = useState<WidgetConfig[]>([]);

  useEffect(() => {
    async function loadConfig() {
      const result = await getDashboardConfig();
      if (result.success && result.data) {
        setWidgets(result.data);
      } else {
        setWidgets(DEFAULT_WIDGET_IDS.map((id, i) => ({ id, order: i })));
      }
      setLoaded(true);
    }
    loadConfig();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setWidgets((prev) => {
        const oldIndex = prev.findIndex((w) => w.id === active.id);
        const newIndex = prev.findIndex((w) => w.id === over.id);
        const moved = arrayMove(prev, oldIndex, newIndex);
        return moved.map((w, i) => ({ ...w, order: i }));
      });
    },
    []
  );

  const handleAddWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => {
      if (prev.some((w) => w.id === widgetId)) return prev;
      return [...prev, { id: widgetId, order: prev.length, type: "builtin" }];
    });
  }, []);

  const handleAddCustomWidget = useCallback(
    (payload: { label: string; href: string; iconName: string; colorKey: string }) => {
      setWidgets((prev) => {
        const id = `custom-${crypto.randomUUID()}`;
        return [
          ...prev,
          {
            id,
            order: prev.length,
            type: "custom",
            customLabel: payload.label,
            customHref: payload.href,
            customIconName: payload.iconName,
            customColorKey: payload.colorKey,
          },
        ];
      });
    },
    []
  );

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => {
      const filtered = prev.filter((w) => w.id !== widgetId);
      return filtered.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  const handleStartEditing = useCallback(() => {
    setPreEditState([...widgets]);
    setIsEditing(true);
  }, [widgets]);

  const handleCancelEditing = useCallback(() => {
    setWidgets(preEditState);
    setIsEditing(false);
  }, [preEditState]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await saveDashboardConfig(widgets);
    setSaving(false);
    setIsEditing(false);
  }, [widgets]);

  const handleReset = useCallback(async () => {
    const result = await resetDashboardToDefaults();
    if (result.success && result.data) {
      setWidgets(result.data);
    } else {
      setWidgets(DEFAULT_WIDGET_IDS.map((id, i) => ({ id, order: i, type: "builtin" as const })));
    }
  }, []);

  const customIconMap: Record<string, typeof Star> = {
    star: Star,
    flag: Flag,
    clipboard: ClipboardList,
    bell: Bell,
    shield: Shield,
    file: FileText,
    check: CheckCircle2,
    alert: AlertTriangle,
    flame: Flame,
    droplets: Droplets,
    zap: Zap,
    hardhat: HardHat,
    stethoscope: Stethoscope,
    heart: Heart,
    leaf: Leaf,
    wrench: Wrench,
    truck: Truck,
    building: Building2,
    utensils: UtensilsCrossed,
    graduation: GraduationCap,
    plug: Plug,
    thermometer: Thermometer,
    eye: Eye,
    lock: Lock,
    package: Package,
    hammer: Hammer,
    warehouse: Warehouse,
  };

  const customColorPresets: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    slate:   { color: "text-slate-700",   bgColor: "bg-slate-50",   borderColor: "border-slate-200" },
    blue:    { color: "text-blue-700",    bgColor: "bg-blue-50",    borderColor: "border-blue-200" },
    red:     { color: "text-red-700",     bgColor: "bg-red-50",     borderColor: "border-red-200" },
    orange:  { color: "text-orange-700",  bgColor: "bg-orange-50",  borderColor: "border-orange-200" },
    amber:   { color: "text-amber-700",   bgColor: "bg-amber-50",   borderColor: "border-amber-200" },
    yellow:  { color: "text-yellow-600",  bgColor: "bg-yellow-50",  borderColor: "border-yellow-200" },
    green:   { color: "text-green-700",   bgColor: "bg-green-50",   borderColor: "border-green-200" },
    emerald: { color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
    teal:    { color: "text-teal-700",    bgColor: "bg-teal-50",    borderColor: "border-teal-200" },
    cyan:    { color: "text-cyan-700",    bgColor: "bg-cyan-50",    borderColor: "border-cyan-200" },
    sky:     { color: "text-sky-700",     bgColor: "bg-sky-50",     borderColor: "border-sky-200" },
    indigo:  { color: "text-indigo-700",  bgColor: "bg-indigo-50",  borderColor: "border-indigo-200" },
    violet:  { color: "text-violet-700",  bgColor: "bg-violet-50",  borderColor: "border-violet-200" },
    purple:  { color: "text-purple-700",  bgColor: "bg-purple-50",  borderColor: "border-purple-200" },
    pink:    { color: "text-pink-700",    bgColor: "bg-pink-50",    borderColor: "border-pink-200" },
    rose:    { color: "text-rose-700",    bgColor: "bg-rose-50",    borderColor: "border-rose-200" },
  };

  const resolvedWidgets: Array<{ config: WidgetConfig; def: WidgetDefinition }> = [...widgets]
    .sort((a, b) => a.order - b.order)
    .map((config) => {
      if (config.type === "custom") {
        if (!config.customLabel || !config.customHref || !config.customIconName) return null;
        const iconComponent =
          customIconMap[config.customIconName as keyof typeof customIconMap] ?? Star;
        const colors = customColorPresets[config.customColorKey ?? ""] ?? customColorPresets.slate;
        return {
          config,
          def: {
            id: config.id,
            label: config.customLabel,
            description: "Egendefinert flis",
            icon: iconComponent,
            href: config.customHref,
            category: "spesial" as const,
            ...colors,
          },
        };
      }
      const def = getWidgetById(config.id);
      return def ? { config, def } : null;
    })
    .filter(Boolean) as Array<{ config: WidgetConfig; def: WidgetDefinition }>;

  const actionableStatusItems = data.statusItems.filter((item) => item.count > 0);
  const functionLinkOptions = WIDGET_REGISTRY.filter((widget) => widget.href.trim().length > 0).map(
    (widget) => ({ label: widget.label, href: widget.href })
  );
  const safeFunctionLinkOptions =
    functionLinkOptions.length > 0
      ? functionLinkOptions
      : [{ label: "Dashboard", href: "/dashboard" }];
  const safeFormLinkOptions =
    data.formLinkOptions.length > 0
      ? data.formLinkOptions
      : [{ label: "Vernerunder", href: "/dashboard/inspections" }];

  if (!loaded) {
    return (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] rounded-xl border-2 border-muted bg-muted/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const showSetupGuide =
    setupGuideProgress && !setupGuideProgress.hidden && tenantId;

  return (
    <div className="space-y-6">
      {showSetupGuide && (
        <SetupGuide tenantId={tenantId} progress={setupGuideProgress} />
      )}

      {showTavleBanner && <TavlePromoBanner />}

      {/* Verktøylinje */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">Mitt dashboard</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogOpen(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Legg til
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Tilbakestill
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEditing}
                className="gap-1.5"
              >
                <X className="h-4 w-4" />
                Avbryt
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                {saving ? "Lagrer..." : "Lagre"}
              </Button>
            </>
          ) : !dashboardLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEditing}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              Tilpass dashboard
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Dashboard er låst av administrator
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          Dra boksene for å endre rekkefølge. Klikk{" "}
          <span className="font-medium">Legg til</span> for å legge til nye moduler, eller trykk{" "}
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px]">
            ✕
          </span>{" "}
          for å fjerne.
        </p>
      )}

      {/* Modul-bokser (navigasjonsfliser) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={resolvedWidgets.map((w) => w.config.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {resolvedWidgets.map(({ config, def }) => (
              <DashboardTile
                key={config.id}
                widget={def}
                isEditing={isEditing}
                onRemove={() => handleRemoveWidget(config.id)}
                count={data.moduleCounts[config.id]}
              />
            ))}

            {isEditing && (
              <button
                onClick={() => setCatalogOpen(true)}
                className="flex flex-col items-center justify-center min-h-[140px] rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">Legg til</span>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Oppfølging nå
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionableStatusItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PlusCircle className="h-4 w-4 text-green-600" />
              Ingen åpne oppfølgingspunkter akkurat nå.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {actionableStatusItems.map((item) => {
                const badgeClassName =
                  item.level === "critical"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : item.level === "warning"
                    ? "bg-amber-100 text-amber-700 border-amber-200"
                    : "bg-blue-100 text-blue-700 border-blue-200";

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-medium">{item.title}</span>
                    <Badge className={badgeClassName}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {item.count}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* HMS-trender og Siste avvik */}
      {(data.weeklyTrendData?.length || data.recentIncidents?.length) ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.weeklyTrendData && data.weeklyTrendData.length > 0 && (
            <HmsTrendChart data={data.weeklyTrendData} />
          )}
          {data.recentIncidents && data.recentIncidents.length > 0 && (
            <RecentIncidentsCard incidents={data.recentIncidents} />
          )}
        </div>
      ) : null}

      {/* Widget-katalog */}
      <WidgetCatalog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        activeWidgetIds={widgets.map((w) => w.id)}
        onAddWidget={handleAddWidget}
        onAddCustomWidget={handleAddCustomWidget}
        availableWidgets={WIDGET_REGISTRY}
        functionLinkOptions={safeFunctionLinkOptions}
        formLinkOptions={safeFormLinkOptions}
      />
    </div>
  );
}
