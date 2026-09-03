"use client";

import { createContext, useContext } from "react";
import { SimpleModeProvider } from "@/hooks/use-simple-mode";
import { SimpleMenuConfigProvider, type SimpleMenuItemsConfig } from "@/hooks/use-simple-menu-config";
import { NotificationsProvider } from "@/hooks/useNotifications";

interface DashboardLockContextType {
  dashboardLocked: boolean;
}

const DashboardLockContext = createContext<DashboardLockContextType>({ dashboardLocked: false });

export function useDashboardLock() {
  return useContext(DashboardLockContext);
}

interface DashboardProvidersProps {
  children: React.ReactNode;
  simpleMenuItems?: SimpleMenuItemsConfig;
  dashboardLocked?: boolean;
}

export function DashboardProviders({ children, simpleMenuItems = null, dashboardLocked = false }: DashboardProvidersProps) {
  return (
    <DashboardLockContext.Provider value={{ dashboardLocked }}>
      <SimpleMenuConfigProvider simpleMenuItems={simpleMenuItems ?? undefined}>
        <SimpleModeProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </SimpleModeProvider>
      </SimpleMenuConfigProvider>
    </DashboardLockContext.Provider>
  );
}

