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
import { Check, Plus, Search, Sparkles } from "lucide-react";
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
  const [customLabel, setCustomLabel] = useState("");
  const [customIconName, setCustomIconName] = useState("star");
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

  const groupedWidgets = filteredWidgets.reduce<Record<string, WidgetDefinition[]>>(
    (acc, widget) => {
      const cat = widget.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(widget);
      return acc;
    },
    {}
  );

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
        <div className="flex max-h-[80vh] flex-col">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle>Legg til boks</DialogTitle>
            <DialogDescription>
              Velg hvilke moduler du vil se på dashboardet ditt
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 pb-4">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Opprett egen flis
              </p>
              <Button
                size="sm"
                disabled={!canAddCustomWidget}
                onClick={() => {
                  if (!canAddCustomWidget) return;
                  onAddCustomWidget({
                    label: customLabel.trim(),
                    href: selectedCustomHref.trim(),
                    iconName: customIconName,
                  });
                  setCustomLabel("");
                  setCustomLinkType("function");
                  setCustomFunctionHref(functionLinkOptions[0]?.href || "/dashboard");
                  setCustomFormHref(formLinkOptions[0]?.href || "/dashboard/forms");
                  setCustomUrl("/dashboard");
                }}
              >
                Legg til egen flis
              </Button>
            </div>
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
                  <option value="star">Stjerne</option>
                  <option value="flag">Flagg</option>
                  <option value="clipboard">Clipboard</option>
                  <option value="bell">Klokke</option>
                  <option value="shield">Skjold</option>
                  <option value="file">Dokument</option>
                  <option value="check">Sjekk</option>
                  <option value="alert">Varsel</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Koble mot</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={customLinkType}
                  onChange={(event) => setCustomLinkType(event.target.value as "function" | "form" | "url")}
                >
                  <option value="function">Funksjon</option>
                  <option value="form">Skjema</option>
                  <option value="url">Egendefinert lenke</option>
                </select>
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
                    <option
                      key={`fn-${index}-${option.label}`}
                      value={option.href}
                    >
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
                    <option
                      key={`form-${index}-${option.label}`}
                      value={option.href}
                    >
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
                  placeholder="/dashboard/forms"
                />
              </div>
            )}
          </div>

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
            {(Object.entries(WIDGET_CATEGORIES) as [WidgetCategory, { label: string }][]).map(
              ([key, { label }]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className="h-7 text-xs"
                >
                  {label}
                </Button>
              )
            )}
          </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
            <div className="space-y-6 pr-2">
              {Object.entries(groupedWidgets).map(([category, widgets]) => {
                const catInfo = WIDGET_CATEGORIES[category as WidgetCategory];
                return (
                  <div key={category}>
                    <h3
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wider mb-2",
                        catInfo?.color ?? "text-muted-foreground"
                      )}
                    >
                      {catInfo?.label ?? category}
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
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
