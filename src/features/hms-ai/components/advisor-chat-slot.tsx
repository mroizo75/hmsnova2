"use client";

import { usePathname } from "next/navigation";
import { AdvisorChat } from "@/features/hms-ai/components/advisor-chat";
import { useTenantNavContext } from "@/hooks/use-tenant-nav-context";

export function AdvisorChatSlot() {
  const pathname = usePathname();
  const { aiEnabled } = useTenantNavContext();

  if (!aiEnabled) return null;
  if (pathname.startsWith("/dashboard/whistleblowing")) return null;

  return <AdvisorChat />;
}
