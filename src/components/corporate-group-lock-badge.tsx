import { Lock } from "lucide-react";

interface CorporateGroupLockBadgeProps {
  isLockedByGroup: boolean;
  className?: string;
}

export function CorporateGroupLockBadge({ isLockedByGroup, className }: CorporateGroupLockBadgeProps) {
  if (!isLockedByGroup) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ${className ?? ""}`}>
      <Lock className="h-3 w-3" />
      Konsern-styrt
    </span>
  );
}
