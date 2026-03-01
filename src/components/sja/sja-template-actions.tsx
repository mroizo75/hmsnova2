"use client";

import { Button } from "@/components/ui/button";
import { ClipboardEdit } from "lucide-react";
import Link from "next/link";

interface SjaTemplateActionsProps {
  templateId: string;
  templateName: string;
}

export function SjaTemplateActions({ templateId }: SjaTemplateActionsProps) {
  return (
    <Link href={`/ansatt/sja/ny?mal=${templateId}`}>
      <Button size="sm" className="shrink-0">
        <ClipboardEdit className="h-4 w-4 mr-1" />
        Fyll ut SJA
      </Button>
    </Link>
  );
}
