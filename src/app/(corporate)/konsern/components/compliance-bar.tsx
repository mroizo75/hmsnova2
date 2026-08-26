"use client";

interface ComplianceBarProps {
  score: number;
  label?: string;
  showLabel?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function scoreBadgeColor(score: number): string {
  if (score >= 80) return "text-emerald-700 bg-emerald-50";
  if (score >= 60) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

export function ComplianceBar({ score, label, showLabel = true }: ComplianceBarProps) {
  return (
    <div className="flex items-center gap-3">
      {showLabel && label && (
        <span className="w-20 shrink-0 text-xs text-gray-500 truncate">{label}</span>
      )}
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(score)}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadgeColor(score)}`}>
        {score}%
      </span>
    </div>
  );
}
