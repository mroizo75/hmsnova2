"use client";

import { useEffect, useState } from "react";
import { OfflineSyncBanner } from "@/components/offline-sync-banner";

export function OfflineSyncBannerWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <OfflineSyncBanner className="mb-4" />;
}
