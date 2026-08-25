"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField } from "./form-builder";
import { SortableField } from "./sortable-field";
import { FileText } from "lucide-react";

interface FormCanvasProps {
  fields: FormField[];
  selectedField: string | null;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
}

export function FormCanvas({ fields, selectedField, onSelectField, onDeleteField }: FormCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "form-canvas",
  });

  return (
    <Card className="min-h-[600px]">
      <CardContent className="p-6">
        <div
          ref={setNodeRef}
          className={`
            min-h-[550px] rounded-lg border-2 border-dashed p-4 transition-colors
            ${isOver ? "border-primary bg-primary/5" : "border-gray-300"}
            ${fields.length === 0 ? "flex items-center justify-center" : ""}
          `}
        >
          {fields.length === 0 ? (
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tomt skjema</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Dra felt fra biblioteket til venstre for å bygge skjemaet
              </p>
            </div>
          ) : (
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {fields.map((field) => (
                  <SortableField
                    key={field.id}
                    field={field}
                    isSelected={selectedField === field.id}
                    onSelect={() => onSelectField(field.id)}
                    onDelete={() => onDeleteField(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

