import {
  ROUTINE_CONTENT_SECTION_KEYS,
  type RoutineContentSectionKey,
  type StructuredRoutineContent,
  structuredHasAnyDisplayable,
  toStructuredRoutineContent,
} from "@/lib/routine-content-model";

export type RoutineStructuredLabels = Record<RoutineContentSectionKey, string> & {
  emptyMessage: string;
  legacyTextTitle?: string;
};

function isNonEmptySection(data: StructuredRoutineContent, key: RoutineContentSectionKey): boolean {
  const v = data[key];
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === "string" && v.trim().length > 0;
}

interface RoutineStructuredBlocksProps {
  content: unknown;
  labels: RoutineStructuredLabels;
  /** Litt annen styling mot ansattflate */
  density?: "comfortable" | "compact";
}

export function RoutineStructuredBlocks({
  content,
  labels,
  density = "comfortable",
}: RoutineStructuredBlocksProps) {
  const data = toStructuredRoutineContent(content);

  if (typeof content === "string" && content.trim()) {
    return (
      <div
        className={
          density === "comfortable"
            ? "rounded-xl border border-border/80 bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5"
            : "rounded-lg border bg-muted/30 px-4 py-3"
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  if (structuredHasAnyDisplayable(data)) {
    return (
      <div className={density === "comfortable" ? "space-y-5" : "space-y-4"}>
        {ROUTINE_CONTENT_SECTION_KEYS.map((key) => {
          if (!isNonEmptySection(data, key)) return null;
          const val = data[key];
          return (
            <section
              key={key}
              className={
                density === "comfortable"
                  ? "rounded-xl border border-border/80 bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5"
                  : "rounded-lg border bg-card px-4 py-4"
              }
            >
              <h3 className="mb-3 text-base font-semibold tracking-tight text-foreground">{labels[key]}</h3>
              {Array.isArray(val) ? (
                <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {val.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{val}</p>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  if (content != null && typeof content === "object" && !Array.isArray(content)) {
    const o = content as Record<string, unknown>;
    const unknownText = Object.entries(o)
      .filter(([k]) => !ROUTINE_CONTENT_SECTION_KEYS.includes(k as RoutineContentSectionKey))
      .map(([k, v]) => {
        if (typeof v === "string" && v.trim()) return `${k}: ${v}`;
        if (Array.isArray(v)) {
          const lines = v.map((x) => String(x)).filter(Boolean);
          if (lines.length) return `${k}:\n${lines.map((l) => `• ${l}`).join("\n")}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");

    if (unknownText.trim()) {
      return (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-4 dark:bg-amber-950/20">
          {labels.legacyTextTitle ? (
            <p className="mb-2 text-xs font-medium text-amber-900 dark:text-amber-200">{labels.legacyTextTitle}</p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{unknownText}</p>
        </div>
      );
    }
  }

  return <p className="text-sm text-muted-foreground">{labels.emptyMessage}</p>;
}
