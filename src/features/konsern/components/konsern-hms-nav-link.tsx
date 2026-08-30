"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasKonsernMenuInHms } from "@/lib/konsern-access";

interface KonsernHmsMessagesNavLinkProps {
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
}

export function KonsernHmsMessagesNavLink({
  className,
  iconClassName,
  onClick,
}: KonsernHmsMessagesNavLinkProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (
    !hasKonsernMenuInHms({
      corporateGroupId: session?.user?.corporateGroupId,
      tenantRole: session?.user?.role,
    })
  ) {
    return null;
  }

  const isActive = pathname === "/dashboard/meldinger";

  return (
    <Link
      href="/dashboard/meldinger"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent",
        className
      )}
    >
      <Mail className={cn("h-4 w-4", iconClassName)} />
      Meldinger
    </Link>
  );
}
