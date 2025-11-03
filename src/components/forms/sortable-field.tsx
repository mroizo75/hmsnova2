"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Trash, Type, AlignLeft, Hash, Calendar, CheckSquare, Circle, ChevronDown, FileUp, PenTool } from "lucide-react";
import { FormField } from "./form-builder";

interface SortableFieldProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SortableField({ field, isSelected, onSelect, onDelete }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const icons: Record<string, any> = {
    TEXT: Type,
    TEXTAREA: AlignLeft,
    NUMBER: Hash,
    DATE: Calendar,
    DATETIME: Calendar,
    CHECKBOX: CheckSquare,
    RADIO: Circle,
    SELECT: ChevronDown,
    FILE: FileUp,
    SIGNATURE: PenTool,
  };

  const Icon = icons[field.type] || Type;

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}>
      <Card
        className={`
          cursor-pointer hover:shadow-md transition-all
          ${isSelected ? "ring-2 ring-primary" : ""}
          ${isDragging ? "opacity-50" : ""}
        `}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing hover:text-primary"
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
            </button>

            {/* Field preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <Label className="font-medium">{field.label}</Label>
                {field.isRequired && (
                  <Badge variant="destructive" className="text-xs">Påkrevd</Badge>
                )}
              </div>

              {field.helpText && (
                <p className="text-xs text-muted-foreground mb-2">{field.helpText}</p>
              )}

              {/* Preview of field */}
              {field.type === "TEXT" && (
                <Input placeholder={field.placeholder || "Skriv her..."} disabled />
              )}
              {field.type === "TEXTAREA" && (
                <Textarea placeholder={field.placeholder || "Skriv her..."} disabled rows={3} />
              )}
              {field.type === "NUMBER" && (
                <Input type="number" placeholder={field.placeholder || "0"} disabled />
              )}
              {field.type === "DATE" && (
                <Input type="date" disabled />
              )}
              {field.type === "DATETIME" && (
                <Input type="datetime-local" disabled />
              )}
              {field.type === "CHECKBOX" && (
                <div className="flex items-center space-x-2">
                  <Checkbox disabled />
                  <Label>Avkrysningsboks</Label>
                </div>
              )}
              {field.type === "RADIO" && field.options && (
                <div className="space-y-2">
                  {field.options.map((option, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <input type="radio" disabled />
                      <Label>{option}</Label>
                    </div>
                  ))}
                </div>
              )}
              {field.type === "SELECT" && field.options && (
                <select className="w-full h-10 px-3 rounded-md border" disabled>
                  <option>Velg...</option>
                  {field.options.map((option, i) => (
                    <option key={i}>{option}</option>
                  ))}
                </select>
              )}
              {field.type === "FILE" && (
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <FileUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Klikk eller dra fil hit</p>
                </div>
              )}
              {field.type === "SIGNATURE" && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center bg-gray-50">
                  <PenTool className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Signeringsområde</p>
                </div>
              )}
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

