import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { canAccessKonsernPortal } from "@/lib/konsern-access";
import { Toaster } from "@/components/ui/toaster";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { KonsernSidebarFooter } from "./components/konsern-sidebar-footer";
import { prisma } from "@/lib/db";
import {
  Building2,
  LayoutDashboard,
  Users,
  FileText,
  Send,
  ScrollText,
  Settings,
  Mail,
  HeartPulse,
  FileBarChart,
} from "lucide-react";

const navItems = [
  { href: "/konsern", label: "Dashboard", icon: LayoutDashboard },
  { href: "/konsern/bedrifter", label: "Bedrifter", icon: Building2 },
  { href: "/konsern/meldinger", label: "Meldinger", icon: Mail },
  { href: "/konsern/psykososialt", label: "Psykososialt", icon: HeartPulse },
  { href: "/konsern/rapporter", label: "Rapporter", icon: FileBarChart },
  { href: "/konsern/brukere", label: "Brukere", icon: Users },
  { href: "/konsern/innhold", label: "Innhold", icon: FileText },
  { href: "/konsern/distribusjon", label: "Distribusjon", icon: Send },
  { href: "/konsern/logg", label: "Revisjonslogg", icon: ScrollText },
  { href: "/konsern/innstillinger", label: "Innstillinger", icon: Settings },
];

export default async function CorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const allowed = canAccessKonsernPortal({
    hasCorporateGroup: Boolean(user.corporateGroupId),
    isSuperAdmin: user.isSuperAdmin === true,
    isSupport: user.isSupport === true,
    tenantId: user.tenantId,
    tenantRole: user.role,
  });

  if (!allowed) {
    redirect("/dashboard");
  }

  let groupName = "Konsern";
  let groupLogoUrl: string | null = null;
  let pendingAckCount = 0;

  if (user.corporateGroupId) {
    const group = await prisma.corporateGroup.findUnique({
      where: { id: user.corporateGroupId },
      select: { name: true, logo: true },
    });
    if (group) {
      groupName = group.name;
      if (group.logo) {
        groupLogoUrl = group.logo;
      }
    }

    // Tell meldinger som venter på lesebekreftelse
    const totalAckMessages = await prisma.corporateGroupMessage.count({
      where: { groupId: user.corporateGroupId, requiresAck: true },
    });
    if (totalAckMessages > 0) {
      const fullyAcked = await prisma.corporateGroupMessage.count({
        where: {
          groupId: user.corporateGroupId,
          requiresAck: true,
          receipts: { some: {} },
        },
      });
      pendingAckCount = totalAckMessages - fullyAcked;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
        {/* Logo / konsern-header */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
          {groupLogoUrl ? (
            <img
              src={groupLogoUrl}
              alt={groupName}
              className="h-8 w-8 rounded object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{groupName}</p>
            <p className="text-[10px] text-gray-400">Konsern</p>
          </div>
        </div>

        {/* Navigasjon */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.href === "/konsern/meldinger" && pendingAckCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                  {pendingAckCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer: HMS Nova branding + brukerinfo + logg ut */}
        <KonsernSidebarFooter
          userName={user.name ?? "Bruker"}
          userEmail={user.email ?? ""}
          groupRole={user.corporateGroupRole ?? "GROUP_READER"}
          hasTenantAccess={Boolean(user.tenantId)}
        />
      </aside>

      {/* Mobile header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          {groupLogoUrl ? (
            <img
              src={groupLogoUrl}
              alt={groupName}
              className="h-6 w-6 rounded object-contain"
            />
          ) : (
            <Building2 className="h-5 w-5 text-blue-600" />
          )}
          <span className="font-semibold text-gray-900 truncate">{groupName}</span>
        </div>
        <Image src="/logo-nova.png" alt="HMS Nova" width={20} height={20} className="opacity-50" />
      </div>

      {/* Mobile nav */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-1 lg:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        ))}
      </div>

      <main className="min-w-0 flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <AppBreadcrumbs />
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
