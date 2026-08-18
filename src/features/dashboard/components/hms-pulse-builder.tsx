"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  getHmsPulseConfig,
  saveHmsPulseConfig,
} from "@/server/actions/dashboard-config.actions";
import {
  DEFAULT_HMS_PULSE_ITEMS,
  MANDATORY_HMS_PULSE_ITEM_IDS,
  type HmsPulseItem,
  type HmsPulseComplianceKey,
} from "@/features/dashboard/lib/hms-pulse-config";

type ComplianceStatusItem = {
  key: HmsPulseComplianceKey;
  label: string;
  value: string;
  severity: "ok" | "warning" | "critical";
};

interface HmsPulseBuilderProps {
  complianceStatus: ComplianceStatusItem[];
  functionOptions: Array<{ label: string; href: string }>;
  formOptions: Array<{ label: string; href: string }>;
  itemCountByHref: Record<string, number>;
}

export function HmsPulseBuilder({
  complianceStatus,
  functionOptions,
  formOptions,
  itemCountByHref,
}: HmsPulseBuilderProps) {
  const [items, setItems] = useState<HmsPulseItem[]>(DEFAULT_HMS_PULSE_ITEMS);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [beforeEdit, setBeforeEdit] = useState<HmsPulseItem[]>([]);

  const [addType, setAddType] = useState<"function" | "form" | "custom">("function");
  const [selectedFunctionHref, setSelectedFunctionHref] = useState(
    functionOptions[0]?.href ?? "/dashboard"
  );
  const [selectedFormHref, setSelectedFormHref] = useState(formOptions[0]?.href ?? "/dashboard/inspections");
  const [customTitle, setCustomTitle] = useState("");
  const [customHref, setCustomHref] = useState("/dashboard");

  useEffect(() => {
    async function loadConfig() {
      const result = await getHmsPulseConfig();
      if (result.success && result.data && result.data.length > 0) {
        setItems(result.data);
      } else {
        setItems(DEFAULT_HMS_PULSE_ITEMS);
      }
      setLoaded(true);
    }
    void loadConfig();
  }, []);

  const complianceMap = useMemo(
    () => new Map(complianceStatus.map((item) => [item.key, item])),
    [complianceStatus]
  );

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);
    setItems(copy);
  };

  const removeItem = (id: string) => {
    if (MANDATORY_HMS_PULSE_ITEM_IDS.includes(id)) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addItem = () => {
    if (addType === "function") {
      const option = functionOptions.find((item) => item.href === selectedFunctionHref);
      if (!option) return;
      setItems((prev) => [
        ...prev,
        {
          id: `function-${crypto.randomUUID()}`,
          title: option.label,
          href: option.href,
          source: "function",
        },
      ]);
      return;
    }

    if (addType === "form") {
      const option = formOptions.find((item) => item.href === selectedFormHref);
      if (!option) return;
      setItems((prev) => [
        ...prev,
        {
          id: `form-${crypto.randomUUID()}`,
          title: option.label,
          href: option.href,
          source: "form",
        },
      ]);
      return;
    }

    if (customTitle.trim().length === 0 || customHref.trim().length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        id: `custom-${crypto.randomUUID()}`,
        title: customTitle.trim(),
        href: customHref.trim(),
        source: "custom",
      },
    ]);
    setCustomTitle("");
    setCustomHref("/dashboard");
  };

  const onStartEdit = () => {
    setBeforeEdit(items);
    setEditing(true);
  };

  const onCancel = () => {
    setItems(beforeEdit);
    setEditing(false);
  };

  const onSave = async () => {
    setSaving(true);
    await saveHmsPulseConfig(items);
    setSaving(false);
    setEditing(false);
  };

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tilsynsoversikt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 rounded-md bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Tilsynsoversikt</CardTitle>
            <CardDescription>
              Bygg din egen sjekkliste med funksjoner og skjemaer for tilsyn.
            </CardDescription>
          </div>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={onStartEdit} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              Tilpass HMS-puls
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
                <X className="h-4 w-4" />
                Avbryt
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" />
                {saving ? "Lagrer..." : "Lagre"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="rounded-md border bg-muted/30 p-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Type</Label>
                <select
                  value={addType}
                  onChange={(event) =>
                    setAddType(event.target.value as "function" | "form" | "custom")
                  }
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="function">Funksjon</option>
                  <option value="form">Skjema</option>
                  <option value="custom">Egendefinert</option>
                </select>
              </div>

              {addType === "function" && (
                <div className="sm:col-span-2">
                  <Label className="text-xs">Velg funksjon</Label>
                  <select
                    value={selectedFunctionHref}
                    onChange={(event) => setSelectedFunctionHref(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    {functionOptions.map((option, index) => (
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

              {addType === "form" && (
                <div className="sm:col-span-2">
                  <Label className="text-xs">Velg skjema</Label>
                  <select
                    value={selectedFormHref}
                    onChange={(event) => setSelectedFormHref(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    {formOptions.map((option, index) => (
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

              {addType === "custom" && (
                <>
                  <div>
                    <Label className="text-xs">Tittel</Label>
                    <Input
                      value={customTitle}
                      onChange={(event) => setCustomTitle(event.target.value)}
                      placeholder="f.eks. Beredskapsøvelse"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Lenke</Label>
                    <Input
                      value={customHref}
                      onChange={(event) => setCustomHref(event.target.value)}
                      placeholder="/dashboard/..."
                    />
                  </div>
                </>
              )}
            </div>

            <Button onClick={addItem} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Legg til punkt
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item, index) => {
            const status = item.complianceKey ? complianceMap.get(item.complianceKey) : null;
            const itemCount = itemCountByHref[item.href];
            const statusBadgeClass =
              status?.severity === "critical"
                ? "bg-red-100 text-red-700 border-red-200"
                : status?.severity === "warning"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-green-100 text-green-700 border-green-200";

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <Link href={item.href} className="font-medium hover:underline">
                    {item.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {item.source}
                    </Badge>
                    {MANDATORY_HMS_PULSE_ITEM_IDS.includes(item.id) && (
                      <Badge variant="outline" className="text-[10px]">
                        Obligatorisk
                      </Badge>
                    )}
                    {item.legalRef && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.legalRef}
                      </Badge>
                    )}
                    {status && (
                      <Badge className={statusBadgeClass}>
                        {status.label}: {status.value}
                      </Badge>
                    )}
                    {itemCount !== undefined && (
                      <Badge variant="secondary">
                        Antall: {itemCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {editing ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      disabled={MANDATORY_HMS_PULSE_ITEM_IDS.includes(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground mt-1" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
