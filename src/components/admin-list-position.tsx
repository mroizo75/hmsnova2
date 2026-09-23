"use client";

import Link from "next/link";
import { forwardRef, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ADMIN_TENANTS_LIST_STORAGE_KEY } from "@/lib/admin-list-url";

export function RememberAdminListUrl({
  storageKey = ADMIN_TENANTS_LIST_STORAGE_KEY,
}: {
  storageKey?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    sessionStorage.setItem(storageKey, query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams, storageKey]);

  return null;
}

export const AdminBackLink = forwardRef<
  HTMLAnchorElement,
  {
    fallbackHref: string;
    storageKey?: string;
    className?: string;
    children: React.ReactNode;
  }
>(function AdminBackLink(
  {
    fallbackHref,
    storageKey = ADMIN_TENANTS_LIST_STORAGE_KEY,
    className,
    children,
  },
  ref,
) {
  const [href, setHref] = useState(fallbackHref);

  useEffect(() => {
    if (fallbackHref.includes("?")) {
      setHref(fallbackHref);
      return;
    }
    const saved = sessionStorage.getItem(storageKey);
    if (saved) setHref(saved);
  }, [fallbackHref, storageKey]);

  return (
    <Link ref={ref} href={href} className={className}>
      {children}
    </Link>
  );
});
