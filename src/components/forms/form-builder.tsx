"use client";

import { useState } from "react";
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { 
  Save, 
  Eye, 
  Settings,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  Circle,
  ChevronDown,
  FileUp,
  PenTool,
  AlignLeft,
  X
} from "lucide-react";
import { FieldLibrary } from "./field-library";
import { FormCanvas } from "./form-canvas";
import { PropertiesPanel } from "./properties-panel";
import { AccessControl } from "./access-control";

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  order: number;
  options?: string[];
  validation?: any;
}

interface FormBuilderProps {
  tenantId: string;
  initialData?: {
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    requiresSignature?: boolean;
    requiresApproval?: boolean;
    accessType?: string;
    allowedRoles?: string[];
    allowedUsers?: string[];
    fields?: FormField[];
  };
}

export function FormBuilder({ tenantId, initialData }: FormBuilderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form metadata
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "CUSTOM");
  const [requiresSignature, setRequiresSignature] = useState(initialData?.requiresSignature ?? true);
  const [requiresApproval, setRequiresApproval] = useState(initialData?.requiresApproval ?? false);
  
  // Access control
  const [accessType, setAccessType] = useState(initialData?.accessType || "ALL");
  const [allowedRoles, setAllowedRoles] = useState<string[]>(initialData?.allowedRoles || []);
  const [allowedUsers, setAllowedUsers] = useState<string[]>(initialData?.allowedUsers || []);

  // Form fields
  const [fields, setFields] = useState<FormField[]>(initialData?.fields || []);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "settings" | "access">("builder");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (!over) return;

    // If dropping a new field from library
    if (active.id.startsWith("library-")) {
      const fieldType = active.id.replace("library-", "");
      addField(fieldType);
      return;
    }

    // If reordering existing fields
    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
  }

  function addField(type: string) {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: getDefaultLabel(type),
      placeholder: "",
      helpText: "",
      isRequired: false,
      order: fields.length,
      options: type === "SELECT" || type === "RADIO" || type === "CHECKBOX" ? ["Alternativ 1", "Alternativ 2"] : undefined,
    };

    setFields([...fields, newField]);
    setSelectedField(newField.id);
  }

  function getDefaultLabel(type: string): string {
    const labels: Record<string, string> = {
      TEXT: "Kort tekst",
      TEXTAREA: "Lang tekst",
      NUMBER: "Tall",
      DATE: "Dato",
      DATETIME: "Dato og tid",
      CHECKBOX: "Avkrysningsboks",
      RADIO: "Flervalg",
      SELECT: "Rullegardin",
      FILE: "Fil",
      SIGNATURE: "Signatur",
    };
    return labels[type] || "Nytt felt";
  }

  function updateField(fieldId: string, updates: Partial<FormField>) {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
  }

  function deleteField(fieldId: string) {
    setFields(fields.filter((f) => f.id !== fieldId));
    if (selectedField === fieldId) {
      setSelectedField(null);
    }
  }

  async function saveForm() {
    if (!title.trim()) {
      toast({
        title: "❌ Feil",
        description: "Skjemaet må ha en tittel",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "❌ Feil",
        description: "Skjemaet må ha minst ett felt",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/forms", {
        method: initialData?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          tenantId,
          title,
          description,
          category,
          requiresSignature,
          requiresApproval,
          accessType,
          allowedRoles: accessType === "ROLES" || accessType === "ROLES_AND_USERS" ? allowedRoles : null,
          allowedUsers: accessType === "USERS" || accessType === "ROLES_AND_USERS" ? allowedUsers : null,
          fields,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke lagre skjema");
      }

      const data = await response.json();

      toast({
        title: "✅ Lagret",
        description: "Skjemaet er lagret",
      });

      router.push("/dashboard/forms");
      router.refresh();
    } catch (error) {
      toast({
        title: "❌ Feil",
        description: "Kunne ikke lagre skjema",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header - Grunnleggende informasjon */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">
                Skjemanavn *
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks: HMS Morgenmøte, Sikkerhetsrunde, Vernerunde..."
                className="text-lg h-12"
              />
            </div>
            <div>
              <Label className="text-base font-semibold mb-2 block">
                Beskrivelse (valgfri)
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv formålet med skjemaet..."
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab("settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Innstillinger
              </Button>
              <Button onClick={saveForm} disabled={isSaving} size="lg">
                {isSaving ? "Lagrer..." : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Lagre skjema
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setActiveTab("builder")}
          className={`px-4 py-2 font-medium ${
            activeTab === "builder"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Builder
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 font-medium ${
            activeTab === "settings"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Innstillinger
        </button>
        <button
          onClick={() => setActiveTab("access")}
          className={`px-4 py-2 font-medium ${
            activeTab === "access"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Tilgangsstyring
        </button>
      </div>

      {/* Content */}
      {activeTab === "builder" && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-12 gap-6">
            {/* Left: Field Library */}
            <div className="col-span-3">
              <FieldLibrary />
            </div>

            {/* Center: Canvas */}
            <div className="col-span-6">
              <FormCanvas
                fields={fields}
                selectedField={selectedField}
                onSelectField={setSelectedField}
                onDeleteField={deleteField}
              />
            </div>

            {/* Right: Properties */}
            <div className="col-span-3">
              <PropertiesPanel
                selectedField={fields.find((f) => f.id === selectedField) || null}
                onUpdateField={updateField}
              />
            </div>
          </div>
        </DndContext>
      )}

      {activeTab === "settings" && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOM">Egendefinert</SelectItem>
                  <SelectItem value="MEETING">Møtereferat</SelectItem>
                  <SelectItem value="INSPECTION">Inspeksjon</SelectItem>
                  <SelectItem value="INCIDENT">Hendelsesrapport</SelectItem>
                  <SelectItem value="RISK">Risikovurdering</SelectItem>
                  <SelectItem value="TRAINING">Opplæring</SelectItem>
                  <SelectItem value="CHECKLIST">Sjekkliste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresSignature"
                checked={requiresSignature}
                onCheckedChange={(checked) => setRequiresSignature(!!checked)}
              />
              <Label htmlFor="requiresSignature">Krever digital signatur</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresApproval"
                checked={requiresApproval}
                onCheckedChange={(checked) => setRequiresApproval(!!checked)}
              />
              <Label htmlFor="requiresApproval">Krever godkjenning fra leder</Label>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "access" && (
        <AccessControl
          tenantId={tenantId}
          accessType={accessType}
          allowedRoles={allowedRoles}
          allowedUsers={allowedUsers}
          onAccessTypeChange={setAccessType}
          onAllowedRolesChange={setAllowedRoles}
          onAllowedUsersChange={setAllowedUsers}
        />
      )}
    </div>
  );
}

