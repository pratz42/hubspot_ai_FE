"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";

function ContentWrapper({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/";
  return (
    <main
      className={`flex-1 min-h-screen overflow-x-hidden transition-all duration-300 ${
        isLoginRoute ? "" : collapsed ? "ml-16" : "ml-64"
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
