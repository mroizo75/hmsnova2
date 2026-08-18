"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronDown, ChevronUp, Plus, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_CATEGORIES,
  type WidgetDefinition,
  type WidgetCategory,
} from "../lib/widget-registry";
import { Label } from "@/components/ui/label";

interface WidgetCatalogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeWidgetIds: string[];
  onAddWidget: (widgetId: string) => void;
  onAddCustomWidget: (payload: {
    label: string;
    href: string;
    iconName: string;
    colorKey: string;
  }) => void;
  availableWidgets: WidgetDefinition[];
  functionLinkOptions: Array<{ label: string; href: string }>;
  formLinkOptions: Array<{ label: string; href: string }>;
}

export function WidgetCatalog({
  open,
  onOpenChange,
  activeWidgetIds,
  onAddWidget,
  onAddCustomWidget,
  availableWidgets,
  functionLinkOptions,
  formLinkOptions,
}: WidgetCatalogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all");
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customIconName, setCustomIconName] = useState("star");
  const [customColorKey, setCustomColorKey] = useState("blue");
  const [customLinkType, setCustomLinkType] = useState<"function" | "form" | "url">("function");
  const [customFunctionHref, setCustomFunctionHref] = useState(functionLinkOptions[0]?.href || "");
  const [customFormHref, setCustomFormHref] = useState(formLinkOptions[0]?.href || "");
  const [customUrl, setCustomUrl] = useState("/dashboard");

  const filteredWidgets = availableWidgets.filter((w) => {
    const matchesSearch =
      search === "" ||
      w.label.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || w.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryOrder: WidgetCategory[] = ["hms", "sikkerhet", "helse", "dokumenter", "personal", "kvalitet", "spesial"];

  const groupedWidgets = categoryOrder.reduce<[WidgetCategory, WidgetDefinition[]][]>((acc, cat) => {
    const items = filteredWidgets.filter((w) => w.category === cat);
    if (items.length > 0) acc.push([cat, items]);
    return acc;
  }, []);

  const selectedCustomHref =
    customLinkType === "function"
      ? customFunctionHref
      : customLinkType === "form"
      ? customFormHref
      : customUrl;
  const canAddCustomWidget = customLabel.trim().length > 0 && selectedCustomHref.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle>Legg til boks</DialogTitle>
            <DialogDescription>
              Velg hvilke moduler du vil se på dashboardet ditt. Klikk på en modul for å legge den til.
            </DialogDescription>
          </DialogHeader>

          {/* Søk og filter */}
          <div className="space-y-3 px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk etter modul..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="h-7 text-xs"
              >
                Alle
              </Button>
              {categoryOrder.map((key) => {
                const cat = WIDGET_CATEGORIES[key];
                const count = availableWidgets.filter((w) => w.category === key).length;
                return (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                    className="h-7 text-xs gap-1"
                  >
                    {cat.label}
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-0.5">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Modulkatalog */}
          <ScrollArea className="min-h-0 flex-1 px-6 pb-4">
            <div className="space-y-5 pr-2">
              {groupedWidgets.map(([category, widgets]) => {
                const catInfo = WIDGET_CATEGORIES[category];
                return (
                  <div key={category}>
                    <h3
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2",
                        catInfo.color
                      )}
                    >
                      <span className="h-px flex-1 bg-current opacity-20" />
                      {catInfo.label}
                      <span className="h-px flex-1 bg-current opacity-20" />
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {widgets.map((widget) => {
                        const isActive = activeWidgetIds.includes(widget.id);
                        return (
                          <button
                            key={widget.id}
                            onClick={() => {
                              if (!isActive) onAddWidget(widget.id);
                            }}
                            disabled={isActive}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                              isActive
                                ? "bg-muted/50 border-muted opacity-60 cursor-not-allowed"
                                : cn(
                                    "hover:shadow-md",
                                    widget.bgColor,
                                    widget.borderColor,
                                    "hover:scale-[1.01]"
                                  )
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                                widget.bgColor,
                                "border",
                                widget.borderColor
                              )}
                            >
                              <widget.icon className={cn("h-5 w-5", widget.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {widget.label}
                                </span>
                                {widget.isAdvanced && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                                    Avansert
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {widget.description}
                              </p>
                            </div>
                            <div className="shrink-0">
                              {isActive ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredWidgets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Ingen moduler funnet for &quot;{search}&quot;
                </div>
              )}

              {/* Opprett egen flis – collapsible, nederst */}
              <div className="rounded-lg border bg-muted/30">
                <button
                  type="button"
                  onClick={() => setCustomExpanded(!customExpanded)}
                  className="flex w-full items-center justify-between p-3 text-left"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Opprett egen flis
                  </span>
                  {customExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {customExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t pt-3">
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Navn</Label>
                        <Input
                          value={customLabel}
                          onChange={(event) => setCustomLabel(event.target.value)}
                          placeholder="f.eks. Legemiddelkontroll"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ikon</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={customIconName}
                          onChange={(event) => setCustomIconName(event.target.value)}
                        >
                          <optgroup label="Generelt">
                            <option value="star">Stjerne</option>
                            <option value="flag">Flagg</option>
                            <option value="clipboard">Sjekkliste</option>
                            <option value="bell">Varselklokke</option>
                            <option value="shield">Skjold / Vern</option>
                            <option value="file">Dokument</option>
                            <option value="check">Godkjent</option>
                            <option value="alert">Advarsel</option>
                            <option value="eye">Tilsyn / Overvåking</option>
                            <option value="lock">Sikkerhet / Lås</option>
                          </optgroup>
                          <optgroup label="Bygg og industri">
                            <option value="hardhat">Hjelm / Bygg</option>
                            <option value="hammer">Hammer / Vedlikehold</option>
                            <option value="wrench">Skrunøkkel / Verktøy</option>
                            <option value="building">Bygning</option>
                            <option value="warehouse">Lager</option>
                            <option value="package">Pakke / Logistikk</option>
                          </optgroup>
                          <optgroup label="Sikkerhet og teknikk">
                            <option value="flame">Brann</option>
                            <option value="zap">Elektro / Strøm</option>
                            <option value="plug">Plugg / El-tilkobling</option>
                            <option value="droplets">Vann / Legionella</option>
                            <option value="thermometer">Temperatur</option>
                          </optgroup>
                          <optgroup label="Helse og miljø">
                            <option value="stethoscope">Medisin / Helse</option>
                            <option value="heart">Trivsel / Arbeidsmiljø</option>
                            <option value="leaf">Miljø</option>
                            <option value="utensils">Mat / Hygiene</option>
                          </optgroup>
                          <optgroup label="Transport og opplæring">
                            <option value="truck">Transport / Kjøretøy</option>
                            <option value="graduation">Opplæring / Kurs</option>
                          </optgroup>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Koble mot</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={customLinkType}
                          onChange={(event) =>
                            setCustomLinkType(event.target.value as "function" | "form" | "url")
                          }
                        >
                          <option value="function">Funksjon</option>
                          <option value="form">Skjema</option>
                          <option value="url">Egendefinert lenke</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Farge</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { key: "blue",    bg: "bg-blue-500" },
                          { key: "sky",     bg: "bg-sky-500" },
                          { key: "cyan",    bg: "bg-cyan-500" },
                          { key: "teal",    bg: "bg-teal-500" },
                          { key: "emerald", bg: "bg-emerald-500" },
                          { key: "green",   bg: "bg-green-500" },
                          { key: "yellow",  bg: "bg-yellow-500" },
                          { key: "amber",   bg: "bg-amber-500" },
                          { key: "orange",  bg: "bg-orange-500" },
                          { key: "red",     bg: "bg-red-500" },
                          { key: "rose",    bg: "bg-rose-500" },
                          { key: "pink",    bg: "bg-pink-500" },
                          { key: "purple",  bg: "bg-purple-500" },
                          { key: "violet",  bg: "bg-violet-500" },
                          { key: "indigo",  bg: "bg-indigo-500" },
                          { key: "slate",   bg: "bg-slate-500" },
                        ] as const).map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setCustomColorKey(c.key)}
                            className={cn(
                              "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                              c.bg,
                              customColorKey === c.key
                                ? "border-foreground ring-2 ring-foreground/20 scale-110"
                                : "border-transparent"
                            )}
                          >
                            <span className="sr-only">{c.key}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {customLinkType === "function" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Velg funksjon</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={customFunctionHref}
                          onChange={(event) => setCustomFunctionHref(event.target.value)}
                        >
                          {functionLinkOptions.map((option, index) => (
                            <option key={`fn-${index}-${option.label}`} value={option.href}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {customLinkType === "form" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Velg skjema</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={customFormHref}
                          onChange={(event) => setCustomFormHref(event.target.value)}
                        >
                          {formLinkOptions.map((option, index) => (
                            <option key={`form-${index}-${option.label}`} value={option.href}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {customLinkType === "url" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Lenke</Label>
                        <Input
                          value={customUrl}
                          onChange={(event) => setCustomUrl(event.target.value)}
                          placeholder="/dashboard/inspections"
                        />
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={!canAddCustomWidget}
                        onClick={() => {
                          if (!canAddCustomWidget) return;
                          onAddCustomWidget({
                            label: customLabel.trim(),
                            href: selectedCustomHref.trim(),
                            iconName: customIconName,
                            colorKey: customColorKey,
                          });
                          setCustomLabel("");
                          setCustomColorKey("blue");
                          setCustomLinkType("function");
                          setCustomFunctionHref(functionLinkOptions[0]?.href || "/dashboard");
                          setCustomFormHref(formLinkOptions[0]?.href || "/dashboard/inspections");
                          setCustomUrl("/dashboard");
                          setCustomExpanded(false);
                        }}
                      >
                        Legg til egen flis
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
