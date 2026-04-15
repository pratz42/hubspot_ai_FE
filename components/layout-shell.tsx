"use client";

import { ReactNode } from "react";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";

function ContentWrapper({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main
      className={`flex-1 min-h-screen transition-all duration-300 ${
        collapsed ? "ml-16" : "ml-64"
      }`}
    >
      {children}
    </main>
  );
}

export function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar />
      <ContentWrapper>{children}</ContentWrapper>
    </SidebarProvider>
  );
}
