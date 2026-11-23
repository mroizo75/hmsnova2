"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getUnreadProductUpdateCount } from "@/server/actions/product-update.actions";

export function ProductUpdateNavBadge({ active }: { active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await getUnreadProductUpdateCount();
        if (!cancelled) setCount(next);
      } catch {
        if (!cancelled) setCount(0);
      }
    }

    void load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, [active]);

  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
        active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
      )}
      aria-label={`${count} uleste systembeskjeder`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
