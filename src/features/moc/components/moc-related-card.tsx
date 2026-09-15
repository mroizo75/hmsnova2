"use client";

import Link from "next/link";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  MOC_STATUS_LABELS,
} from "@/lib/moc-labels";

export type MocLinkItem = {
  moc: { id: string; number: string; title: string; status: string };
};

export function MocRelatedCard({
  links,
  moduleEnabled,
}: {
  links?: MocLinkItem[] | null;
  moduleEnabled?: boolean;
}) {
  if (!moduleEnabled || !links || links.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Endringssaker (MoC)
      </p>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.moc.id}>
            <Link href={`/dashboard/moc/${link.moc.id}`} className="text-sm hover:underline">
              {link.moc.number}: {link.moc.title}
            </Link>
            <Badge variant="outline" className="ml-2 text-xs">
              {MOC_STATUS_LABELS[link.moc.status as keyof typeof MOC_STATUS_LABELS] ?? link.moc.status}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
