"use client";

import { SimpleModeProvider } from "@/hooks/use-simple-mode";
import { SimpleMenuConfigProvider, type SimpleMenuItemsConfig } from "@/hooks/use-simple-menu-config";
import { NotificationsProvider } from "@/hooks/useNotifications";

interface DashboardProvidersProps {
  children: React.ReactNode;
  simpleMenuItems?: SimpleMenuItemsConfig;
}

export function DashboardProviders({ children, simpleMenuItems = null }: DashboardProvidersProps) {
  return (
    <SimpleMenuConfigProvider simpleMenuItems={simpleMenuItems ?? undefined}>
      <SimpleModeProvider>
        <NotificationsProvider>{children}</NotificationsProvider>
      </SimpleModeProvider>
    </SimpleMenuConfigProvider>
  );
}

