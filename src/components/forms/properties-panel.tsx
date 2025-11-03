"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { FormField } from "./form-builder";

interface PropertiesPanelProps {
  selectedField: FormField | null;
  onUpdateField: (fieldId: string, updates: Partial<FormField>) => void;
}

export function PropertiesPanel({ selectedField, onUpdateField }: PropertiesPanelProps) {
  if (!selectedField) {
    return (
      <Card className="sticky top-6">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Velg et felt for å redigere egenskaper
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasOptions = ["RADIO", "SELECT", "CHECKBOX"].includes(selectedField.type);

  function updateOptions(newOptions: string[]) {
    if (!selectedField) return;
    onUpdateField(selectedField.id, { options: newOptions });
  }

  function addOption() {
    if (!selectedField) return;
    const current = selectedField.options || [];
    updateOptions([...current, `Alternativ ${current.length + 1}`]);
  }

  function removeOption(index: number) {
    if (!selectedField) return;
    const current = selectedField.options || [];
    updateOptions(current.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    if (!selectedField) return;
    const current = selectedField.options || [];
    updateOptions(current.map((opt, i) => (i === index ? value : opt)));
  }

  return (
    <Card className="sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg">Egenskaper</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Label */}
        <div>
          <Label>Etikett *</Label>
          <Input
            value={selectedField.label}
            onChange={(e) => onUpdateField(selectedField.id, { label: e.target.value })}
            placeholder="Feltnavn"
            className="mt-2"
          />
        </div>

        {/* Placeholder */}
        {!["CHECKBOX", "RADIO", "FILE", "SIGNATURE"].includes(selectedField.type) && (
          <div>
            <Label>Plassholder</Label>
            <Input
              value={selectedField.placeholder || ""}
              onChange={(e) => onUpdateField(selectedField.id, { placeholder: e.target.value })}
              placeholder="F.eks: Skriv her..."
              className="mt-2"
            />
          </div>
        )}

        {/* Help text */}
        <div>
          <Label>Hjelpetekst</Label>
          <Textarea
            value={selectedField.helpText || ""}
            onChange={(e) => onUpdateField(selectedField.id, { helpText: e.target.value })}
            placeholder="Valgfri beskrivelse..."
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Required */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="required"
            checked={selectedField.isRequired}
            onCheckedChange={(checked) =>
              onUpdateField(selectedField.id, { isRequired: !!checked })
            }
          />
          <Label htmlFor="required" className="cursor-pointer">
            Påkrevd felt
          </Label>
        </div>

        {/* Options for SELECT, RADIO, CHECKBOX */}
        {hasOptions && (
          <div>
            <Label className="mb-2 block">Alternativer</Label>
            <div className="space-y-2">
              {(selectedField.options || []).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Alternativ ${index + 1}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Legg til alternativ
              </Button>
            </div>
          </div>
        )}

        {/* Field type badge */}
        <div className="pt-4 border-t">
          <Label className="text-xs text-muted-foreground">Felttype</Label>
          <Badge variant="secondary" className="mt-2">
            {selectedField.type}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

