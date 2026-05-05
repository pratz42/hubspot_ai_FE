"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { ChatProvider } from "@/lib/chat/context";
import { ChatPanel } from "./chat/ChatPanel";
import { ChatLauncherButton } from "./chat/ChatLauncherButton";

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
    <ChatProvider>
      <SidebarProvider>
        <Sidebar />
        <ContentWrapper>{children}</ContentWrapper>
        <ChatPanel />
        <ChatLauncherButton />
      </SidebarProvider>
    </ChatProvider>
  );
}
