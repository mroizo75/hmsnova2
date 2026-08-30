interface BoardingProgressBarProps {
  total: number;
  completed: number;
  skipped: number;
}

export function BoardingProgressBar({ total, completed, skipped }: BoardingProgressBarProps) {
  const done = completed + skipped;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {done}/{total} ({pct}%)
      </span>
    </div>
  );
}
