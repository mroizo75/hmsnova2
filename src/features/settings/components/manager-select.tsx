"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ManagerSelectOption = {
  userId: string;
  label: string;
};

type ManagerSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ManagerSelectOption[];
  noneValue: string;
  noneLabel: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  triggerClassName?: string;
};

function sortByLabel(options: ManagerSelectOption[]): ManagerSelectOption[] {
  return [...options].sort((a, b) =>
    a.label.localeCompare(b.label, "nb", { sensitivity: "base" })
  );
}

function filterOptions(options: ManagerSelectOption[], query: string): ManagerSelectOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const startsWith = options.filter((option) => option.label.toLowerCase().startsWith(q));
  if (startsWith.length > 0) return startsWith;
  return options.filter((option) => option.label.toLowerCase().includes(q));
}

export function ManagerSelect({
  value,
  onValueChange,
  options,
  noneValue,
  noneLabel,
  disabled = false,
  placeholder = "Velg nærmeste leder",
  id,
  className,
  triggerClassName,
}: ManagerSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = sortByLabel(options);
  const filtered = filterOptions(sorted, query);
  const selectedLabel =
    value === noneValue
      ? noneLabel
      : options.find((option) => option.userId === value)?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function select(next: string) {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-left text-base shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:text-sm",
          triggerClassName
        )}
      >
        <span className="line-clamp-1">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="flex items-center gap-2 border-b px-2 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Skriv bokstav eller navn..."
              className="h-8 border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={value === noneValue}
              className={cn(
                "flex w-full px-3 py-2 text-left text-sm hover:bg-muted",
                value === noneValue && "bg-muted font-medium"
              )}
              onClick={() => select(noneValue)}
            >
              {noneLabel}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Ingen treff</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.userId}
                  type="button"
                  role="option"
                  aria-selected={value === option.userId}
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm hover:bg-muted",
                    value === option.userId && "bg-muted font-medium"
                  )}
                  onClick={() => select(option.userId)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
