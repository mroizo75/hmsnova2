"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  GripVertical,
  Lock,
  Eye,
  EyeOff,
  Save,
  Plus,
  Settings2,
  PinIcon,
  RefreshCw,
  Columns2,
  PanelLeft,
} from "lucide-react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HmsTavlePlan, HmsTavleSectionType, TavleDisplayMode } from "@prisma/client";
import { getPlanLimits, isSectionAllowed } from "@/features/hms-tavle/lib/tavle-plan-limits";
import type { HmsTavleSection } from "@prisma/client";
import { TavleSectionConfigDialog } from "./tavle-section-config-dialog";
import { getSectionLabels } from "@/features/hms-tavle/lib/bransje-config";
import { cn } from "@/lib/utils";

// Fallback-labels (bygg/anlegg) — overstyres av bransje-prop
export const SECTION_LABELS: Record<HmsTavleSectionType, string> = {
  SHA_PLAN: "SHA-plan",
  MANNSKAPSLISTE: "Mannskapsliste",
  AVVIK_STATISTIKK: "Avvik / RUH statistikk",
  RUH_LISTE: "RUH – uønskede hendelser",
  SJA_AKTIVE: "SJA",
  VERNERUNDE_STATUS: "Vernerunde",
  KONTAKTINFO: "Kontaktpersoner",
  BEREDSKAPSPLAN: "Beredskapsplan",
  DOKUMENT_HUB: "Dokumenter",
  EKSTERN_LENKE: "Eksterne lenker",
  VAERMELDING: "Værvarsling",
  KPI_DASHBOARD: "KPI og nøkkeltall",
  HMS_PLAN_AARSHJUL: "HMS-årshjul",
  FREMDRIFTSPLAN: "Fremdriftsplan",
  RIGGPLAN: "Riggplan",
  RISIKOMATRISE: "Risikomatrise",
  OPPLARING_STATUS: "Opplæring",
  LOVKRAV_SJEKKLISTE: "Lovkrav-sjekkliste",
  NYHETER_MELDINGER: "Meldinger",
  SNARVEIER: "Hurtigtilganger",
  GJEST_SKJEMA: "Gjesteskjema",
  GJESTESERVICE_STATUS: "Tillitspanel for gjesteservice",
};

const DISPLAY_MODE_CONFIG: Record<TavleDisplayMode, { label: string; icon: React.ReactNode; cls: string }> = {
  SIDEBAR:  { label: "Sidebar",   icon: <PanelLeft className="h-3.5 w-3.5" />,   cls: "bg-slate-100 text-slate-700 border-slate-300" },
  FAST:     { label: "Fast",      icon: <PinIcon className="h-3.5 w-3.5" />,     cls: "bg-blue-100 text-blue-700 border-blue-300" },
  KARUSELL: { label: "Karusell",  icon: <RefreshCw className="h-3.5 w-3.5" />,   cls: "bg-green-100 text-green-700 border-green-300" },
  FOKUS:    { label: "Fokus",     icon: <Columns2 className="h-3.5 w-3.5" />,    cls: "bg-purple-100 text-purple-700 border-purple-300" },
};

/* Section types that have editable config */
const CONFIGURABLE_TYPES = new Set<HmsTavleSectionType>([
  "SHA_PLAN", "BEREDSKAPSPLAN", "AVVIK_STATISTIKK", "RUH_LISTE",
  "KONTAKTINFO", "NYHETER_MELDINGER", "FREMDRIFTSPLAN", "RIGGPLAN",
  "RISIKOMATRISE", "DOKUMENT_HUB", "VAERMELDING", "SNARVEIER",
  "GJEST_SKJEMA", "GJESTESERVICE_STATUS",
]);

const ALL_TYPES = Object.keys(SECTION_LABELS) as HmsTavleSectionType[];

function SortableSection({
  section,
  isLocked,
  onToggleVisible,
  onChangeDisplayMode,
  onEditConfig,
  canManage,
  labels,
}: {
  section: HmsTavleSection;
  isLocked: boolean;
  onToggleVisible: (id: string, val: boolean) => void;
  onChangeDisplayMode: (id: string, mode: TavleDisplayMode) => void;
  onEditConfig: (id: string) => void;
  canManage: boolean;
  labels: Record<string, string>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: isLocked || !canManage,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasConfig = CONFIGURABLE_TYPES.has(section.type);
  const displayMode: TavleDisplayMode = (section.displayMode as TavleDisplayMode) ?? "KARUSELL";
  const MODES: TavleDisplayMode[] = ["SIDEBAR", "FAST", "KARUSELL", "FOKUS"];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isLocked ? "opacity-50" : ""}`}
    >
      {canManage && !isLocked ? (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <Lock className="h-4 w-4 text-muted-foreground" />
      )}

      <span className="flex-1 text-sm font-medium">
        {labels[section.type] ?? section.type}
      </span>

      {isLocked && (
        <Badge variant="outline" className="text-xs">
          Krever høyere plan
        </Badge>
      )}

      {/* DisplayMode-toggle */}
      {canManage && !isLocked && (
        <div className="flex items-center gap-1 border rounded-md overflow-hidden shrink-0">
          {MODES.map((mode) => {
            const cfg = DISPLAY_MODE_CONFIG[mode];
            const active = displayMode === mode;
            return (
              <button
                key={mode}
                title={cfg.label}
                onClick={() => onChangeDisplayMode(section.id, mode)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors",
                  active ? cfg.cls : "text-muted-foreground hover:bg-muted"
                )}
              >
                {cfg.icon}
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {canManage && !isLocked && hasConfig && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => onEditConfig(section.id)}
          title="Rediger innhold"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {canManage && !isLocked && (
        <Switch
          checked={section.isVisible}
          onCheckedChange={(val) => onToggleVisible(section.id, val)}
          aria-label="Vis/skjul seksjon"
        />
      )}
      {section.isVisible && !isLocked ? (
        <Eye className="h-4 w-4 text-green-600" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

interface Props {
  tavleId: string;
  sections: HmsTavleSection[];
  plan: HmsTavlePlan;
  canManage: boolean;
  isAddon: boolean;
  bransje?: string | null;
}

export function TavleSectionBuilder({ tavleId, sections: initial, plan, canManage, isAddon, bransje }: Props) {
  const sectionLabels = { ...SECTION_LABELS, ...getSectionLabels(bransje) };
  const router = useRouter();
  const [sections, setSections] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const limits = getPlanLimits(plan);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const existingTypes = new Set(sections.map((s) => s.type));
  const availableToAdd = ALL_TYPES.filter(
    (t) => !existingTypes.has(t) && isSectionAllowed(plan, t)
  );

  const editingSection = editingId ? sections.find((s) => s.id === editingId) : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, order: i + 1 }));
    });
    setDirty(true);
  }

  function toggleVisible(id: string, val: boolean) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, isVisible: val } : s)));
    setDirty(true);
  }

  function changeDisplayMode(id: string, mode: TavleDisplayMode) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, displayMode: mode } : s)));
    setDirty(true);
  }

  function updateConfig(id: string, config: Record<string, any>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, config } : s)));
    setDirty(true);
    toast.success("Innhold oppdatert — husk å lagre!");
  }

  function addSection(type: HmsTavleSectionType) {
    const newSection: HmsTavleSection = {
      id: `new-${Date.now()}`,
      tavleId,
      type,
      title: null,
      order: sections.length + 1,
      isVisible: true,
      displayMode: "KARUSELL",
      config: {},
    };
    setSections((prev) => [...prev, newSection]);
    setDirty(true);
    if (CONFIGURABLE_TYPES.has(type)) {
      setEditingId(newSection.id);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/hms-tavle/${tavleId}/sections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections: sections.map((s, i) => ({
            type: s.type,
            title: s.title,
            order: i + 1,
            isVisible: s.isVisible,
            displayMode: (s.displayMode as TavleDisplayMode) ?? "KARUSELL",
            config: s.config ?? {},
          })),
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Feil ved lagring");
      }
      toast.success("Seksjoner lagret");
      setDirty(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Seksjoner</h3>
          <p className="text-sm text-muted-foreground">
            Dra og slipp for rekkefølge. Velg visningsmode per seksjon: <span className="font-medium">Sidebar</span> (fast venstre), <span className="font-medium">Fast</span> (alltid synlig), <span className="font-medium">Karusell</span> (roterer) eller <span className="font-medium">Fokus</span> (fremhevet, full bredde).
          </p>
        </div>
        {canManage && dirty && (
          <Button onClick={save} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Lagrer..." : "Lagre endringer"}
          </Button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                isLocked={!isSectionAllowed(plan, section.type)}
                onToggleVisible={toggleVisible}
                onChangeDisplayMode={changeDisplayMode}
                onEditConfig={setEditingId}
                canManage={canManage}
                labels={sectionLabels}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {canManage && availableToAdd.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Legg til seksjon</p>
          <div className="flex flex-wrap gap-2">
            {availableToAdd.map((type) => (
              <Button
                key={type}
                size="sm"
                variant="outline"
                onClick={() => addSection(type)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {sectionLabels[type] ?? type}
              </Button>
            ))}
          </div>
        </div>
      )}

      {editingSection && (
        <TavleSectionConfigDialog
          open={!!editingId}
          onClose={() => setEditingId(null)}
          type={editingSection.type}
          config={(editingSection.config as Record<string, any>) ?? {}}
          isAddon={isAddon}
          tavleId={tavleId}
          onSave={(cfg) => updateConfig(editingSection.id, cfg)}
        />
      )}
    </div>
  );
}
