import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  AlertTriangle,
  FileText,
  BookOpen,
  Shield,
  HardHat,
  Users,
  ClipboardCheck,
  Eye,
} from "lucide-react";
import { getGroupTenantInfo } from "@/server/actions/corporate-group-read.actions";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}

const tenantNavItems = [
  { href: "", label: "Oversikt", icon: LayoutDashboard },
  { href: "/avvik", label: "Hendelser", icon: AlertTriangle },
  { href: "/rutiner", label: "Rutiner", icon: FileText },
  { href: "/dokumenter", label: "Dokumenter", icon: BookOpen },
  { href: "/risikovurderinger", label: "Risiko", icon: Shield },
  { href: "/sja", label: "SJA", icon: HardHat },
  { href: "/vernerunder", label: "Vernerunder", icon: ClipboardCheck },
  { href: "/ansatte", label: "Ansatte", icon: Users },
];

export default async function TenantDrillDownLayout({ children, params }: TenantLayoutProps) {
  const { tenantId } = await params;
  const tenant = await getGroupTenantInfo(tenantId);

  if (!tenant) {
    notFound();
  }

  const basePath = `/konsern/bedrifter/${tenantId}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/konsern/bedrifter"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Bedrifter
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-500">
            {tenant.city}
            {tenant.orgNumber && ` · Org.nr: ${tenant.orgNumber}`}
            {tenant.industry && ` · ${tenant.industry}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          <Eye className="h-3 w-3" />
          Konsern-visning
        </div>
      </div>

      {/* Fane-navigasjon */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {tenantNavItems.map((item) => (
          <Link
            key={item.href}
            href={`${basePath}${item.href}`}
            className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        ))}
      </div>

      <div>{children}</div>
    </div>
  );
}
