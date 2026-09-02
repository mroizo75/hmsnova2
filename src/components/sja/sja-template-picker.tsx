"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookTemplate } from "lucide-react";

const NONE_VALUE = "__none__";

interface SjaTemplateOption {
  id: string;
  name: string;
}

interface SjaTemplatePickerProps {
  templates: SjaTemplateOption[];
  selectedTemplateId?: string;
}

export function SjaTemplatePicker({ templates, selectedTemplateId }: SjaTemplatePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (templates.length === 0) {
    return null;
  }

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === NONE_VALUE) {
      params.delete("mal");
    } else {
      params.set("mal", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-2 max-w-md">
      <Label htmlFor="sja-template-picker" className="text-base flex items-center gap-2">
        <BookTemplate className="h-4 w-4 text-purple-600" />
        Start fra en SJA-mal (valgfritt)
      </Label>
      <Select value={selectedTemplateId ?? NONE_VALUE} onValueChange={handleChange}>
        <SelectTrigger id="sja-template-picker" className="h-12 text-base">
          <SelectValue placeholder="Velg mal..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Ingen mal – start blankt</SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
