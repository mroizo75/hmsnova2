"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ClipboardEdit } from "lucide-react";
import Link from "next/link";

interface SjaTemplateActionsProps {
  templateId: string;
  templateName: string;
  /** Sti til "Ny SJA"-skjemaet malen skal fylles ut i. Default: ansattflyten. */
  basePath?: string;
}

export function SjaTemplateActions({ templateId, basePath = "/ansatt/sja/ny" }: SjaTemplateActionsProps) {
  const t = useTranslations("employeeSjaTemplateActions");

  return (
    <Link href={`${basePath}?mal=${templateId}`}>
      <Button size="sm" className="shrink-0">
        <ClipboardEdit className="h-4 w-4 mr-1" />
        {t("fill")}
      </Button>
    </Link>
  );
}
