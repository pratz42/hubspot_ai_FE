"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Target,
  Settings,
  Home,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  Contact,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import API from "@/lib/api";
import { useSidebar } from "./sidebar-context";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Contacts", href: "/contacts", icon: Contact },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Deals", href: "/deals", icon: Briefcase },
  { name: "Campaigns", href: "/campaign", icon: Target },
  { name: "Admin", href: "/admin", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const [user, setUser] = useState<{ email: string; name?: string; role?: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setIsLoadingUser(false);
        return;
      }
      try {
        const res = await API.get("/auth/me");
        setUser({
          email: res.data?.email ?? "",
          name: res.data?.name ?? "",
          role: res.data?.role ?? "",
        });
      } catch {
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchCurrentUser();
  // Re-run on every route change so login → dashboard picks up the new token.
  }, [pathname]);

  const isLoginRoute = pathname === "/";
  if (isLoginRoute || isLoadingUser || !user) return null;

  const displayName = user?.name || user?.email || "Sales User";
  const displayEmail = user?.email || "sales@company.com";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 bg-slate-950 border-r border-slate-800/50 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-16 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors z-10 shadow-sm"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-slate-400" />
        )}
      </button>

      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-slate-800/50 flex-shrink-0 overflow-hidden",
          collapsed ? "justify-center px-0" : "px-5 gap-3"
        )}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-white leading-tight">Hubspot AI</div>
            <div className="text-xs text-slate-500 leading-tight flex items-center gap-1 mt-0.5">
              <Sparkles className="w-2.5 h-2.5 text-orange-500" />
              AI Sales Insight
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto sidebar-scroll">
        {navigation
          .filter((item) => !item.adminOnly || user?.role === "admin")
          .map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center py-2.5 text-sm font-medium rounded-lg transition-all duration-150 group",
                  collapsed ? "justify-center px-2" : "px-3 gap-3",
                  isActive
                    ? "bg-orange-500/10 text-orange-400"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-orange-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                {!collapsed && <span className="flex-1">{item.name}</span>}
                {!collapsed && isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                )}
              </Link>
            );
          })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800/50 p-2 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1.5 rounded-lg bg-slate-900/60">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "flex items-center w-full py-2 text-xs font-medium text-slate-500 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors",
            collapsed ? "justify-center px-2" : "px-3 gap-2.5"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}
