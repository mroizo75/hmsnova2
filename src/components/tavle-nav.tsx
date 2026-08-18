"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Monitor,
  PlusCircle,
  Settings,
  LogOut,
  HardHat,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/dashboard/hms-tavle", label: "Mine tavler", icon: Monitor },
  { href: "/dashboard/hms-tavle/ny", label: "Ny tavle", icon: PlusCircle },
];

interface TavleNavProps {
  tenantName: string | null;
}

export function TavleNav({ tenantName }: TavleNavProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-gray-200 shrink-0">
      {/* Logo + bedriftsnavn */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard/hms-tavle" className="flex items-center gap-2.5">
          <Image src="/logo-nova.png" alt="HMS Nova" width={110} height={40} className="h-8 w-auto" />
        </Link>
        {tenantName && (
          <p className="mt-2 text-xs text-gray-500 truncate font-medium">{tenantName}</p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <HardHat className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs text-blue-700 font-semibold">Digital HMS Tavle</span>
        </div>
      </div>

      {/* Navigasjonslenker */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard/hms-tavle"
              ? pathname === "/dashboard/hms-tavle"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-gray-400")} />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bunn – innstillinger og logg ut */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings className="h-4 w-4 text-gray-400" />
          Kontoinnstillinger
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4 text-gray-400" />
          Logg ut
        </button>
      </div>
    </aside>
  );
}

/* ─── Mobil-versjon ─── */
export function TavleMobileNav({ tenantName }: TavleNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
      <Link href="/dashboard/hms-tavle" className="flex items-center gap-2">
        <HardHat className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-sm text-gray-900">Digital HMS Tavle</span>
      </Link>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard/hms-tavle"
              ? pathname === "/dashboard/hms-tavle"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"
              )}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Logg ut"
          aria-label="Logg ut"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
