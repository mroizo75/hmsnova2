"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaInstallButton } from "@/components/pwa-install-button";

interface KonsernSidebarFooterProps {
  userName: string;
  userEmail: string;
  groupRole: string;
  hasTenantAccess: boolean;
}

const roleLabels: Record<string, string> = {
  GROUP_ADMIN: "Administrator",
  GROUP_HMS: "HMS-ansvarlig",
  GROUP_READER: "Leser",
};

export function KonsernSidebarFooter({ userName, userEmail, groupRole, hasTenantAccess }: KonsernSidebarFooterProps) {
  return (
    <div className="border-t border-gray-200">
      {/* HMS Nova branding */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <Image src="/logo-nova.png" alt="HMS Nova" width={20} height={20} className="opacity-60" />
        <span className="text-[10px] tracking-wide text-gray-400 uppercase">Drevet av HMS Nova</span>
      </div>

      {/* Brukerinfo */}
      <div className="px-5 pb-3">
        <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
        <p className="mt-0.5 text-[10px] font-medium text-blue-600">
          {roleLabels[groupRole] ?? groupRole}
        </p>
      </div>

      <div className="px-3 pb-4 space-y-1">
        <PwaInstallButton />
        {hasTenantAccess && (
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Bedriftens HMS-system
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logg ut
        </Button>
      </div>
    </div>
  );
}
