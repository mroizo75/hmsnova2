"use client";

import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Type, AlignLeft, Hash, Calendar, Clock, Briefcase, CheckSquare, Circle, ChevronDown, FileUp, PenTool, BarChart3, Heading2 } from "lucide-react";

const FIELD_TYPES = [
  { id: "TEXT", label: "Kort tekst", icon: Type, description: "Enkel tekstlinje" },
  { id: "TEXTAREA", label: "Lang tekst", icon: AlignLeft, description: "Tekstområde med flere linjer" },
  { id: "NUMBER", label: "Tall", icon: Hash, description: "Tallverdi" },
  { id: "DATE", label: "Dato", icon: Calendar, description: "Datovelger" },
  { id: "DATETIME", label: "Dato og tid", icon: Clock, description: "Dato med tidspunkt" },
  { id: "PROJECT", label: "Prosjekt", icon: Briefcase, description: "Koble innsending til prosjekt" },
  { id: "CHECKBOX", label: "Avkrysning", icon: CheckSquare, description: "Ja/Nei checkbox" },
  { id: "RADIO", label: "Radioknapper", icon: Circle, description: "Velg ett alternativ" },
  { id: "SELECT", label: "Rullegardin", icon: ChevronDown, description: "Dropdown-meny" },
  { id: "LIKERT_SCALE", label: "Likert-skala", icon: BarChart3, description: "1-5 skala (Enig/Uenig)" },
  { id: "FILE", label: "Filopplasting", icon: FileUp, description: "Last opp fil/bilde" },
  { id: "SIGNATURE", label: "Signatur", icon: PenTool, description: "Digital signatur" },
  { id: "SECTION_HEADER", label: "Seksjonsoverskrift", icon: Heading2, description: "Overskrift for gruppering" },
];

function DraggableField({ field }: { field: typeof FIELD_TYPES[0] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${field.id}`,
  });

  const Icon = field.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        p-3 rounded-lg border-2 border-dashed bg-white cursor-grab active:cursor-grabbing
        hover:border-primary hover:bg-primary/5 transition-all
        ${isDragging ? "opacity-50" : ""}
      `}
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded flex items-center justify-center bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{field.label}</p>
          <p className="text-xs text-muted-foreground truncate">{field.description}</p>
        </div>
      </div>
    </div>
  );
}

export function FieldLibrary() {
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-lg">Feltbibliotek</CardTitle>
        <p className="text-sm text-muted-foreground">
          Dra felt til skjemaet
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {FIELD_TYPES.map((field) => (
          <DraggableField key={field.id} field={field} />
        ))}
      </CardContent>
    </Card>
  );
}

